import {Injectable, Logger} from "@nestjs/common";
import {Cron, CronExpression} from "@nestjs/schedule";
import {DealStatus, DiscountApprovalStatus, NotificationEntityType, NotificationType} from "@/generated/prisma/client";
import {PrismaService} from "@/database/prisma.service";
import {NotificationsService} from "@/modules/notifications/notifications.service";
import {RbacService} from "@/modules/rbac/rbac.service";
import {findDiscountApproverIds} from "./discount-approval";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * A discount request otherwise only ever produced one notification, easy
 * to lose in the bell while the deal sits unsignable (D-2026-0026 waited
 * two days). Once a request has waited a day, its approvers are reminded
 * — at most once a day each — until someone decides or the reservation
 * ends, which also rewrites these reminders (see
 * resolveDiscountRequestNotifications).
 */
@Injectable()
export class DiscountApprovalReminderService {
    private readonly logger = new Logger(DiscountApprovalReminderService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly notifications: NotificationsService,
        private readonly rbacService: RbacService,
    ) {}

    @Cron(CronExpression.EVERY_HOUR)
    async remindPendingDiscounts(now = new Date()) {
        const deals = await this.prisma.deal.findMany({
            where: {
                deletedAt: null,
                status: DealStatus.RESERVED,
                discountApprovalStatus: DiscountApprovalStatus.PENDING,
                reservedAt: {lte: new Date(now.getTime() - DAY_MS)},
            },
            select: {
                id: true, companyId: true, branchId: true, dealNumber: true,
                reservedAt: true, requestedDiscountPercent: true,
            },
        });

        let sent = 0;
        for (const deal of deals) {
            const percent = Number(deal.requestedDiscountPercent ?? 0);
            const days = Math.floor((now.getTime() - deal.reservedAt.getTime()) / DAY_MS);
            const approverIds = await findDiscountApproverIds(this.prisma, this.rbacService, {
                companyId: deal.companyId, branchId: deal.branchId, percent,
            });

            for (const userId of approverIds) {
                // The original request counts too: nobody is asked twice
                // within a day, whether by the request or by a reminder.
                const recent = await this.prisma.notification.findFirst({
                    where: {
                        userId,
                        type: NotificationType.DISCOUNT_APPROVAL_REQUESTED,
                        entityType: NotificationEntityType.DEAL,
                        entityId: deal.id,
                        createdAt: {gte: new Date(now.getTime() - DAY_MS)},
                    },
                    select: {id: true},
                });
                if (recent) continue;

                await this.notifications.create({
                    companyId: deal.companyId,
                    userId,
                    type: NotificationType.DISCOUNT_APPROVAL_REQUESTED,
                    title: `Discount approval for deal ${deal.dealNumber} still waiting (${days}d)`,
                    templateKey: "discountApprovalReminder",
                    params: {dealNumber: deal.dealNumber, percent, days},
                    entityType: NotificationEntityType.DEAL,
                    entityId: deal.id,
                });
                sent++;
            }
        }

        this.logger.log(`Checked ${deals.length} pending discount request(s), sent ${sent} reminder(s)`);
    }
}
