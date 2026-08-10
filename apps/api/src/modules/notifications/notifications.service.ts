import {ForbiddenException, Injectable} from "@nestjs/common";
import {NotificationEntityType, NotificationType, Prisma} from "@/generated/prisma/client";
import {PrismaService} from "@/database/prisma.service";
import {AuthUser} from "@/common/types/auth-user.type";
import {QueryNotificationsDto} from "./dto/query-notifications.dto";

interface CreateNotificationParams {
    companyId: string;
    userId: string;
    type: NotificationType;
    title: string;
    message?: string;
    entityType?: NotificationEntityType;
    entityId?: string;
}

@Injectable()
export class NotificationsService {
    constructor(private readonly prisma: PrismaService) {}

    async create(params: CreateNotificationParams) {
        return this.prisma.notification.create({ data: params });
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
        return { success: true };
    }

    async markAllAsRead(user: AuthUser) {
        if (!user.companyId) throw new ForbiddenException("User does not belong to a company");

        await this.prisma.notification.updateMany({
            where: { companyId: user.companyId, userId: user.id, isRead: false },
            data: { isRead: true, readAt: new Date() },
        });
        return { success: true };
    }
}