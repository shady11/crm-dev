import {Injectable, Logger} from "@nestjs/common";
import {Cron, CronExpression} from "@nestjs/schedule";
import {NotificationEntityType, NotificationType, TaskStatus} from "@/generated/prisma/client";
import {PrismaService} from "@/database/prisma.service";
import {NotificationsService} from "./notifications.service";

@Injectable()
export class NotificationsCronService {
    private readonly logger = new Logger(NotificationsCronService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly notifications: NotificationsService,
    ) {}

    @Cron(CronExpression.EVERY_HOUR)
    async checkExpiringReservations() {
        const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const deals = await this.prisma.deal.findMany({
            where: {
                status: "RESERVED",
                reservationExpiresAt: { lte: in24h, gte: new Date() },
                managerId: { not: null },
            },
            select: { id: true, dealNumber: true, managerId: true, companyId: true, reservationExpiresAt: true },
        });

        for (const deal of deals) {
            await this.notifyOnce({
                userId: deal.managerId!,
                companyId: deal.companyId,
                type: NotificationType.RESERVATION_EXPIRING,
                entityType: NotificationEntityType.DEAL,
                entityId: deal.id,
                title: `Reservation for ${deal.dealNumber} expires soon`,
                message: `Expires ${deal.reservationExpiresAt!.toLocaleDateString()}`,
            });
        }

        this.logger.log(`Checked expiring reservations: ${deals.length} found`);
    }

    @Cron(CronExpression.EVERY_HOUR)
    async checkTaskDeadlines() {
        const now = new Date();
        const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const activeStatuses = [TaskStatus.TODO, TaskStatus.IN_PROGRESS];

        const dueSoon = await this.prisma.task.findMany({
            where: { status: { in: activeStatuses }, dueDate: { gte: now, lte: in24h }, deletedAt: null },
            select: { id: true, title: true, assignedToId: true, companyId: true, dueDate: true },
        });

        for (const task of dueSoon) {
            await this.notifyOnce({
                userId: task.assignedToId,
                companyId: task.companyId,
                type: NotificationType.TASK_DUE_SOON,
                entityType: NotificationEntityType.TASK,
                entityId: task.id,
                title: "Task due soon",
                message: task.title,
            });
        }

        const overdue = await this.prisma.task.findMany({
            where: { status: { in: activeStatuses }, dueDate: { lt: now }, deletedAt: null },
            select: { id: true, title: true, assignedToId: true, companyId: true },
        });

        for (const task of overdue) {
            await this.notifyOnce({
                userId: task.assignedToId,
                companyId: task.companyId,
                type: NotificationType.TASK_OVERDUE,
                entityType: NotificationEntityType.TASK,
                entityId: task.id,
                title: "Task overdue",
                message: task.title,
            });
        }

        this.logger.log(`Checked task deadlines: ${dueSoon.length} due soon, ${overdue.length} overdue`);
    }

    // не даёт слать одно и то же уведомление на каждый прогон крона —
    // проверяет, не было ли уже уведомления по этой сущности за последние 24ч
    private async notifyOnce(params: {
        userId: string;
        companyId: string;
        type: NotificationType;
        entityType: NotificationEntityType;
        entityId: string;
        title: string;
        message?: string;
    }) {
        const existing = await this.prisma.notification.findFirst({
            where: {
                userId: params.userId,
                type: params.type,
                entityType: params.entityType,
                entityId: params.entityId,
                createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            },
        });

        if (existing) return;

        await this.notifications.create(params);
    }
}