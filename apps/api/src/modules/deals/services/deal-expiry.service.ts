import {Injectable, Logger} from "@nestjs/common";
import {Cron, CronExpression} from "@nestjs/schedule";
import {ActivityAction, ActivityType, DealStatus, DiscountApprovalStatus, NotificationEntityType, NotificationType, UnitStatus} from "@/generated/prisma/client";
import {PrismaService} from "@/database/prisma.service";
import {NotificationsService} from "@/modules/notifications/notifications.service";
import {DealActivityService} from "./deal-activity.service";
import {resolveDiscountRequestNotifications} from "./discount-approval";
import {MoneyHeldNotifier} from "./money-held-notifier.service";
import {activityText} from "@/modules/activities/activity-templates";
import {TasksService} from "@/modules/tasks/tasks.service";
import {RbacService} from "@/modules/rbac/rbac.service";
import {formatMoney} from "../deal.constants";

@Injectable()
export class DealExpiryService {
    private readonly logger = new Logger(DealExpiryService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly notifications: NotificationsService,
        private readonly activityService: DealActivityService,
        private readonly moneyHeld: MoneyHeldNotifier,
        private readonly tasksService: TasksService,
        private readonly rbacService: RbacService,
    ) {}

    @Cron(CronExpression.EVERY_10_MINUTES)
    async expireOverdueReservations() {
        const candidates = await this.prisma.deal.findMany({
            where: {
                status: DealStatus.RESERVED,
                reservationExpiresAt: { lt: new Date() },
            },
            select: {
                id: true,
                dealNumber: true,
                unitId: true,
                managerId: true,
                companyId: true,
                branchId: true,
                clientId: true,
                manager: { select: { fullName: true } },
                discountApprovalStatus: true,
                requestedDiscountPercent: true,
            },
        });

        if (candidates.length === 0) {
            return;
        }

        let expiredCount = 0;

        for (const deal of candidates) {
            const wasExpired = await this.prisma.$transaction(async db => {
                const flipped = await db.deal.updateMany({
                    where: { id: deal.id, status: DealStatus.RESERVED },
                    data: { status: DealStatus.EXPIRED },
                });

                if (flipped.count === 0) {
                    return false;
                }

                const unitReleased = await db.unit.updateMany({
                    where: { id: deal.unitId, status: UnitStatus.RESERVED },
                    data: { status: UnitStatus.AVAILABLE },
                });

                const tasksCancelled = await this.tasksService.cancelOpenTasksForDeal(db, {
                    companyId: deal.companyId, dealId: deal.id, actorId: deal.managerId,
                });

                if (deal.managerId) {
                    await this.activityService.expireReservation({
                        db,
                        companyId: deal.companyId,
                        userId: deal.managerId,
                        dealId: deal.id,
                        clientId: deal.clientId,
                        metadata: { reason: 'reservation_expiry_cron', tasksCancelled },
                    });

                    // The unit's own activity trail, distinct from the deal's
                    // expireReservation() call above — without this, the
                    // unit's history shows no record of being released.
                    if (unitReleased.count > 0) {
                        await db.activity.create({
                            data: {
                                companyId: deal.companyId,
                                userId: deal.managerId,
                                unitId: deal.unitId,
                                action: ActivityAction.CHANGED_UNIT_STATUS,
                                type: ActivityType.UNIT_STATUS_CHANGED,
                                ...activityText('unitRelistedAfterExpiry'),
                                metadata: { toStatus: UnitStatus.AVAILABLE, dealId: deal.id, reason: 'reservation_expiry_cron' },
                            },
                        });
                    }
                }

                return true;
            });

            if (!wasExpired) continue;
            expiredCount++;

            if (deal.managerId) {
                await this.notifications.create({
                    companyId: deal.companyId,
                    userId: deal.managerId,
                    type: NotificationType.DEAL_STATUS_CHANGED,
                    title: `Reservation for deal ${deal.dealNumber} has expired`,
                    message: 'The unit has been released back to available inventory.',
                    templateKey: 'reservationExpired',
                    params: { dealNumber: deal.dealNumber },
                    entityType: NotificationEntityType.DEAL,
                    entityId: deal.id,
                });
            }

            await this.moneyHeld.notifyIfHeld(deal);
            await this.notifyTeamLeads(deal);

            // A discount request still waiting on a lapsed reservation no
            // longer needs anyone's decision.
            if (deal.discountApprovalStatus === DiscountApprovalStatus.PENDING) {
                try {
                    await resolveDiscountRequestNotifications(this.notifications, deal, {outcome: "withdrawn"});
                } catch (error) {
                    this.logger.error(`Failed to update discount-request notifications for deal ${deal.id}`, error instanceof Error ? error.stack : String(error));
                }
            }
        }

        this.logger.log(`Expired ${expiredCount} of ${candidates.length} overdue reservation(s)`);
    }

    /**
     * SH-10: the branch's Sales Head(s) hear about a lapsed reservation too,
     * with whose deal it was and any money still held on it: the dashboard
     * warns before expiry, but nothing said one actually lapsed. Team leads
     * are the roles holding deals.reassign, as for payment escalations.
     * Best-effort: the expiry itself has already been saved.
     */
    private async notifyTeamLeads(deal: {
        id: string; dealNumber: string; companyId: string; branchId: string | null;
        managerId: string | null; manager: { fullName: string } | null;
    }) {
        if (!deal.branchId) return;
        try {
            const teamLeadRoleIds = await this.rbacService.findRoleIdsWithPermission(deal.companyId, 'deals.reassign');
            if (teamLeadRoleIds.length === 0) return;

            const heads = await this.prisma.user.findMany({
                where: {
                    companyId: deal.companyId,
                    branchId: deal.branchId,
                    roleId: { in: teamLeadRoleIds },
                    isActive: true,
                    // A head whose own reservation lapsed was told above.
                    ...(deal.managerId ? { id: { not: deal.managerId } } : {}),
                },
                select: { id: true },
            });
            if (heads.length === 0) return;

            const [paid, company] = await Promise.all([
                this.prisma.payment.aggregate({ where: { dealId: deal.id, deletedAt: null }, _sum: { amount: true } }),
                this.prisma.company.findUnique({ where: { id: deal.companyId }, select: { currency: true } }),
            ]);
            const held = Number(paid._sum.amount ?? 0);
            const currency = company?.currency ?? null;
            const managerName = deal.manager?.fullName ?? '—';

            for (const head of heads) {
                await this.notifications.create({
                    companyId: deal.companyId,
                    userId: head.id,
                    type: NotificationType.DEAL_STATUS_CHANGED,
                    title: `Reservation for deal ${deal.dealNumber} (${managerName}) has expired`,
                    ...(held > 0
                        ? {
                            message: `${formatMoney(held, currency)} is still held on it.`,
                            templateKey: 'teamReservationExpiredHeld' as const,
                            params: { dealNumber: deal.dealNumber, managerName, amount: held, currency },
                        }
                        : {
                            templateKey: 'teamReservationExpired' as const,
                            params: { dealNumber: deal.dealNumber, managerName },
                        }),
                    entityType: NotificationEntityType.DEAL,
                    entityId: deal.id,
                });
            }
        } catch (error) {
            this.logger.error(`Failed to tell the Sales Head about expired deal ${deal.id}`, error instanceof Error ? error.stack : String(error));
        }
    }
}
