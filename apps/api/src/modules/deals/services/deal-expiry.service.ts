import {Injectable, Logger} from "@nestjs/common";
import {Cron, CronExpression} from "@nestjs/schedule";
import {DealStatus, NotificationEntityType, NotificationType, UnitStatus} from "@/generated/prisma/client";
import {PrismaService} from "@/database/prisma.service";
import {NotificationsService} from "@/modules/notifications/notifications.service";
import {DealActivityService} from "./deal-activity.service";

@Injectable()
export class DealExpiryService {
    private readonly logger = new Logger(DealExpiryService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly notifications: NotificationsService,
        private readonly activityService: DealActivityService,
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
                clientId: true,
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

                await db.unit.updateMany({
                    where: { id: deal.unitId, status: UnitStatus.RESERVED },
                    data: { status: UnitStatus.AVAILABLE },
                });

                if (deal.managerId) {
                    await this.activityService.expireReservation({
                        db,
                        companyId: deal.companyId,
                        userId: deal.managerId,
                        dealId: deal.id,
                        clientId: deal.clientId,
                        metadata: { reason: 'reservation_expiry_cron' },
                    });
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
                    entityType: NotificationEntityType.DEAL,
                    entityId: deal.id,
                });
            }
        }

        this.logger.log(`Expired ${expiredCount} of ${candidates.length} overdue reservation(s)`);
    }
}