import {ForbiddenException, Injectable} from "@nestjs/common";
import {DealStatus, Prisma, TaskStatus, UnitStatus, UserRole} from "@/generated/prisma/client";
import {PrismaService} from "@/database/prisma.service";
import {AuthUser} from "@/common/types/auth-user.type";
import {ACTIVE_DEAL_STATUSES} from "@/modules/deals/deal.constants";
import {OPEN_LEAD_STATUSES} from "@/modules/leads/lead.constants";
import {isBranchScopedRole} from "@/common/constants/branch-scope.constants";

@Injectable()
export class DashboardService {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * Resolves the branchId to filter deal/task/payment queries by: a
     * branch-scoped role is always pinned to their own branch (BR-B1); a
     * company-wide role may optionally narrow to one branch via the query
     * param (BR-B3) — kept as a separate, later-checked branch so it can
     * never be mistaken for the sales-role restriction above it.
     */
    private resolveBranchId(user: AuthUser, branchId?: string): string | undefined {
        if (isBranchScopedRole(user.role)) {
            return user.branchId ?? undefined;
        }

        return branchId;
    }

    async getKpis(user: AuthUser, projectId?: string, branchId?: string) {
        if (!user.companyId) throw new ForbiddenException("User does not belong to a company");
        const companyId = user.companyId;
        const effectiveBranchId = this.resolveBranchId(user, branchId);

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const [revenueAgg, activeDealsCount, unitsAgg, overdueTasksCount] = await Promise.all([
            this.prisma.payment.aggregate({
                where: {
                    deal: { companyId, projectId, branchId: effectiveBranchId },
                    paidAt: { gte: startOfMonth },
                    deletedAt: null,
                },
                _sum: { amount: true },
            }),
            this.prisma.deal.count({
                where: { companyId, projectId, branchId: effectiveBranchId, status: { in: ACTIVE_DEAL_STATUSES } },
            }),
            // Units are deliberately company-wide, not branch-scoped (BR-C1) —
            // no branch filter here even for a branch-scoped viewer.
            this.prisma.unit.groupBy({
                by: ["status"],
                where: { project: { companyId, id: projectId }, deletedAt: null },
                _count: { _all: true },
            }),
            this.prisma.task.count({
                where: {
                    companyId,
                    branchId: effectiveBranchId,
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

    async getRevenueTrend(user: AuthUser, projectId?: string, branchId?: string) {
        if (!user.companyId) throw new ForbiddenException("User does not belong to a company");
        const effectiveBranchId = this.resolveBranchId(user, branchId);

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        const payments = await this.prisma.payment.findMany({
            where: {
                deal: { companyId: user.companyId, projectId, branchId: effectiveBranchId },
                paidAt: { gte: sixMonthsAgo },
                deletedAt: null,
            },
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

        // Units are deliberately company-wide (BR-C1) — visible to every role
        // regardless of branch, no filtering here.
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

    async getAttentionItems(user: AuthUser, projectId?: string, branchId?: string) {
        if (!user.companyId) throw new ForbiddenException("User does not belong to a company");
        const companyId = user.companyId;
        const effectiveBranchId = this.resolveBranchId(user, branchId);
        const in3Days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

        const [expiringDeals, urgentTasks] = await Promise.all([
            this.prisma.deal.findMany({
                where: {
                    companyId,
                    projectId,
                    branchId: effectiveBranchId,
                    status: DealStatus.RESERVED,
                    reservationExpiresAt: { lte: in3Days },
                },
                select: {
                    id: true, dealNumber: true, reservationExpiresAt: true,
                    client: { select: { fullName: true } },
                },
                orderBy: { reservationExpiresAt: "asc" },
                take: 5,
            }),
            this.prisma.task.findMany({
                where: {
                    companyId,
                    branchId: effectiveBranchId,
                    deletedAt: null,
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

    async getRecentActivity(user: AuthUser, projectId?: string, branchId?: string) {
        if (!user.companyId) throw new ForbiddenException("User does not belong to a company");
        const effectiveBranchId = this.resolveBranchId(user, branchId);

        const where: Prisma.ActivityWhereInput = {
            companyId: user.companyId,
            ...(projectId ? { deal: { projectId } } : {}),
        };

        // Activity has no branchId of its own — filtered through whichever
        // entity it's attached to. An activity with none of the three set
        // never matches a branch filter, same as an unassigned record would.
        if (effectiveBranchId) {
            where.OR = [
                { lead: { branchId: effectiveBranchId } },
                { client: { branchId: effectiveBranchId } },
                { deal: { branchId: effectiveBranchId } },
            ];
        }

        return this.prisma.activity.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: 10,
            select: {
                id: true, title: true, description: true, type: true, createdAt: true,
                user: { select: { id: true, fullName: true } },
                deal: { select: { id: true, dealNumber: true } },
            },
        });
    }

    /**
     * BR-E1: per-branch deal count and revenue comparison, for the
     * COMPANY_ADMIN dashboard. Includes branches with zero deals.
     */
    async getBranchComparison(user: AuthUser) {
        if (!user.companyId) throw new ForbiddenException("User does not belong to a company");
        const companyId = user.companyId;

        const [branches, dealCounts] = await Promise.all([
            this.prisma.branch.findMany({
                where: { companyId },
                select: { id: true, name: true },
                orderBy: { name: "asc" },
            }),
            this.prisma.deal.groupBy({
                by: ["branchId"],
                where: { companyId, status: { in: ACTIVE_DEAL_STATUSES } },
                _count: { _all: true },
            }),
        ]);

        // Payment has no branchId of its own — revenue is summed per branch
        // via its deals, mirroring getKpis's aggregate-per-slice style rather
        // than adding a new column for one report.
        const revenueByBranch = await Promise.all(
            branches.map(async (branch) => {
                const agg = await this.prisma.payment.aggregate({
                    where: { deal: { companyId, branchId: branch.id }, deletedAt: null },
                    _sum: { amount: true },
                });
                return { branchId: branch.id, revenue: agg._sum.amount ?? 0 };
            }),
        );

        return branches.map((branch) => ({
            branchId: branch.id,
            branchName: branch.name,
            dealCount: dealCounts.find((d) => d.branchId === branch.id)?._count._all ?? 0,
            revenue: revenueByBranch.find((r) => r.branchId === branch.id)?.revenue ?? 0,
        }));
    }

    /**
     * SH-A2: a SALES_HEAD's daily-standup view of their own team — open
     * leads, active deals, tasks due, and a last-activity timestamp per
     * SALES_MANAGER. Deliberately not full reporting, same spirit as
     * getBranchComparison above but one level down: one branch's managers
     * instead of a company-wide comparison. SALES_HEAD is always
     * branch-scoped (BranchGuard), so there's no optional branchId param
     * here the way the company-wide dashboard queries above take one.
     */
    async getTeamSnapshot(user: AuthUser) {
        if (!user.companyId) throw new ForbiddenException("User does not belong to a company");
        if (!user.branchId) throw new ForbiddenException("User is not assigned to a branch");

        const companyId = user.companyId;
        const branchId = user.branchId;

        const managers = await this.prisma.user.findMany({
            where: { companyId, branchId, role: UserRole.SALES_MANAGER, isActive: true, deletedAt: null },
            select: { id: true, fullName: true, email: true },
            orderBy: { fullName: "asc" },
        });

        const now = new Date();

        return Promise.all(
            managers.map(async (manager) => {
                const [openLeads, activeDeals, tasksDue, lastActivity] = await Promise.all([
                    this.prisma.lead.count({
                        where: {
                            companyId, branchId,
                            managerId: manager.id,
                            deletedAt: null,
                            status: { in: OPEN_LEAD_STATUSES },
                        },
                    }),
                    this.prisma.deal.count({
                        where: {
                            companyId, branchId,
                            managerId: manager.id,
                            deletedAt: null,
                            status: { in: ACTIVE_DEAL_STATUSES },
                        },
                    }),
                    this.prisma.task.count({
                        where: {
                            companyId, branchId,
                            assignedToId: manager.id,
                            deletedAt: null,
                            status: { in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS] },
                            dueDate: { lte: now },
                        },
                    }),
                    this.prisma.activity.findFirst({
                        where: { companyId, userId: manager.id },
                        orderBy: { createdAt: "desc" },
                        select: { createdAt: true },
                    }),
                ]);

                return {
                    manager,
                    openLeads,
                    activeDeals,
                    tasksDue,
                    lastActivityAt: lastActivity?.createdAt ?? null,
                };
            }),
        );
    }
}
