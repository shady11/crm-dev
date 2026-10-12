import {ForbiddenException, Injectable} from "@nestjs/common";
import {NotificationEntityType, NotificationType, Prisma} from "@/generated/prisma/client";
import {PrismaService} from "@/database/prisma.service";
import {AuthUser} from "@/common/types/auth-user.type";
import {QueryNotificationsDto} from "./dto/query-notifications.dto";
import {NotificationsGateway} from "@/modules/notifications/notifications.gateway";
import type {NotificationTemplate} from "@/modules/notifications/notification-templates";

// title/message stay required: they're the English fallback for anything
// that can't render the template.
type CreateNotificationParams = {
    companyId: string;
    userId: string;
    type: NotificationType;
    title: string;
    message?: string;
    entityType?: NotificationEntityType;
    entityId?: string;
} & (NotificationTemplate | {templateKey?: undefined; params?: undefined});

@Injectable()
export class NotificationsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly gateway: NotificationsGateway,
    ) {}

    async create(params: CreateNotificationParams) {
        const notification = await this.prisma.notification.create({ data: params });

        const unreadCount = await this.prisma.notification.count({
            where: { userId: params.userId, isRead: false },
        });

        this.gateway.emitToUser(params.userId, "notification:new", notification);
        this.gateway.emitToUser(params.userId, "notification:unread-count", { count: unreadCount });

        return notification;
    }

    /**
     * Brings notifications that asked someone to act on a record up to date
     * once it's been dealt with — "Discount approval needed for D-0026"
     * becomes "Discount for D-0026 approved by Nurlan" for every approver
     * who was asked, and stops counting as unread. Each affected reader's
     * bell is told to refetch. Returns how many notifications changed.
     */
    async resolveForEntity(params: {
        companyId: string;
        type: NotificationType;
        entityType: NotificationEntityType;
        entityId: string;
        resolvedType: NotificationType;
        title: string;
        message?: string;
    } & NotificationTemplate) {
        const where: Prisma.NotificationWhereInput = {
            companyId: params.companyId,
            type: params.type,
            entityType: params.entityType,
            entityId: params.entityId,
        };

        const affected = await this.prisma.notification.findMany({
            where,
            select: { userId: true },
            distinct: ["userId"],
        });
        if (affected.length === 0) return 0;

        // Read flag first: the content update below changes `type`, after
        // which `where` no longer matches.
        await this.prisma.notification.updateMany({
            where: { ...where, isRead: false },
            data: { isRead: true, readAt: new Date() },
        });
        const { count } = await this.prisma.notification.updateMany({
            where,
            data: {
                type: params.resolvedType,
                title: params.title,
                message: params.message ?? null,
                templateKey: params.templateKey,
                params: params.params,
            },
        });

        for (const { userId } of affected) {
            const unreadCount = await this.prisma.notification.count({ where: { userId, isRead: false } });
            this.gateway.emitToUser(userId, "notification:updated", { entityType: params.entityType, entityId: params.entityId });
            this.gateway.emitToUser(userId, "notification:unread-count", { count: unreadCount });
        }

        return count;
    }

    async findAll(user: AuthUser, query: QueryNotificationsDto) {
        if (!user.companyId) throw new ForbiddenException("User does not belong to a company");

        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const skip = (page - 1) * limit;

        const where: Prisma.NotificationWhereInput = {
            companyId: user.companyId,
            userId: user.id,
            isRead: query.isRead,
        };

        const [items, total] = await Promise.all([
            this.prisma.notification.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
            this.prisma.notification.count({ where }),
        ]);

        return { items, meta: { page, limit, total, pages: Math.ceil(total / limit) } };
    }

    async getUnreadCount(user: AuthUser) {
        if (!user.companyId) throw new ForbiddenException("User does not belong to a company");

        const count = await this.prisma.notification.count({
            where: { companyId: user.companyId, userId: user.id, isRead: false },
        });

        return { count };
    }

    async markAsRead(user: AuthUser, id: string) {
        await this.prisma.notification.updateMany({
            where: { id, userId: user.id },
            data: { isRead: true, readAt: new Date() },
        });

        const count = await this.prisma.notification.count({ where: { userId: user.id, isRead: false } });
        this.gateway.emitToUser(user.id, "notification:unread-count", { count });

        return { success: true };
    }

    async markAllAsRead(user: AuthUser) {
        if (!user.companyId) throw new ForbiddenException("User does not belong to a company");

        await this.prisma.notification.updateMany({
            where: { companyId: user.companyId, userId: user.id, isRead: false },
            data: { isRead: true, readAt: new Date() },
        });

        this.gateway.emitToUser(user.id, "notification:unread-count", { count: 0 });

        return { success: true };
    }
}