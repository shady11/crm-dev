import {ForbiddenException, Injectable} from "@nestjs/common";
import {DealStatus, TaskStatus, UnitStatus} from "@/generated/prisma/client";
import {PrismaService} from "@/database/prisma.service";
import {AuthUser} from "@/common/types/auth-user.type";
import {ACTIVE_DEAL_STATUSES} from "@/modules/deals/deal.constants";

@Injectable()
export class DashboardService {
    constructor(private readonly prisma: PrismaService) {}

    async getKpis(user: AuthUser, projectId?: string) {
        if (!user.companyId) throw new ForbiddenException("User does not belong to a company");
        const companyId = user.companyId;

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const [revenueAgg, activeDealsCount, unitsAgg, overdueTasksCount] = await Promise.all([
            this.prisma.payment.aggregate({
                where: { deal: { companyId, projectId }, paidAt: { gte: startOfMonth }, deletedAt: null },
                _sum: { amount: true },
            }),
            this.prisma.deal.count({ where: { companyId, projectId, status: { in: ACTIVE_DEAL_STATUSES } } }),
            this.prisma.unit.groupBy({
                by: ["status"],
                where: { project: { companyId, id: projectId }, deletedAt: null },
                _count: { _all: true },
            }),
            this.prisma.task.count({
                where: {
                    companyId,
                    deletedAt: null,
                    status: { in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS] },
                    dueDate: { lt: new Date() },
                    ...(projectId ? { deal: { projectId } } : {}),
                },
            }),
        ]);

        const totalUnits = unitsAgg.reduce((sum, g) => sum + g._count._all, 0);
        const availableUnits = unitsAgg.find((g) => g.status === UnitStatus.AVAILABLE)?._count._all ?? 0;

        return {
            revenueThisMonth: revenueAgg._sum.amount ?? 0,
            activeDealsCount,
            availableUnits,
            totalUnits,
            overdueTasksCount,
        };
    }

    async getRevenueTrend(user: AuthUser, projectId?: string) {
        if (!user.companyId) throw new ForbiddenException("User does not belong to a company");

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        const payments = await this.prisma.payment.findMany({
            where: { deal: { companyId: user.companyId, projectId }, paidAt: { gte: sixMonthsAgo }, deletedAt: null },
            select: { amount: true, paidAt: true },
        });

        const buckets = new Map<string, number>();
        for (let i = 0; i < 6; i++) {
            const d = new Date(sixMonthsAgo);
            d.setMonth(d.getMonth() + i);
            buckets.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, 0);
        }

        for (const payment of payments) {
            const key = `${payment.paidAt.getFullYear()}-${String(payment.paidAt.getMonth() + 1).padStart(2, "0")}`;
            if (buckets.has(key)) buckets.set(key, buckets.get(key)! + Number(payment.amount));
        }

        return Array.from(buckets.entries()).map(([month, revenue]) => ({ month, revenue }));
    }

    async getUnitsSummary(user: AuthUser, projectId?: string) {
        if (!user.companyId) throw new ForbiddenException("User does not belong to a company");

        const counts = await this.prisma.unit.groupBy({
            by: ["status"],
            where: { project: { companyId: user.companyId, id: projectId }, deletedAt: null },
            _count: { _all: true },
        });

        return Object.values(UnitStatus).map((status) => ({
            status,
            count: counts.find((c) => c.status === status)?._count._all ?? 0,
        }));
    }

    async getAttentionItems(user: AuthUser, projectId?: string) {
        if (!user.companyId) throw new ForbiddenException("User does not belong to a company");
        const companyId = user.companyId;
        const in3Days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

        const [expiringDeals, urgentTasks] = await Promise.all([
            this.prisma.deal.findMany({
                where: { companyId, projectId, status: DealStatus.RESERVED, reservationExpiresAt: { lte: in3Days } },
                select: {
                    id: true, dealNumber: true, reservationExpiresAt: true,
                    client: { select: { fullName: true } },
                },
                orderBy: { reservationExpiresAt: "asc" },
                take: 5,
            }),
            this.prisma.task.findMany({
                where: {
                    companyId, deletedAt: null,
                    status: { in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS] },
                    dueDate: { lte: in3Days },
                    ...(projectId ? { deal: { projectId } } : {}),
                },
                select: {
                    id: true, title: true, dueDate: true,
                    assignedTo: { select: { id: true, fullName: true } },
                },
                orderBy: { dueDate: "asc" },
                take: 5,
            }),
        ]);

        return { expiringDeals, urgentTasks };
    }

    async getRecentActivity(user: AuthUser, projectId?: string) {
        if (!user.companyId) throw new ForbiddenException("User does not belong to a company");

        return this.prisma.activity.findMany({
            where: {
                companyId: user.companyId,
                ...(projectId ? { deal: { projectId } } : {}),
            },
            orderBy: { createdAt: "desc" },
            take: 10,
            select: {
                id: true, title: true, description: true, type: true, createdAt: true,
                user: { select: { id: true, fullName: true } },
                deal: { select: { id: true, dealNumber: true } },
            },
        });
    }
}