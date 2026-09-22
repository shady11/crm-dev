import {ForbiddenException, Injectable} from "@nestjs/common";
import * as XLSX from "xlsx";
import {DealStatus, LeadStatus, PaymentMethod, PaymentScheduleStatus, Prisma, TaskStatus, UnitStatus} from "@/generated/prisma/client";
import {PrismaService} from "@/database/prisma.service";
import {AuthUser} from "@/common/types/auth-user.type";
import {hasPermission} from "@/common/utils/permissions.util";
import {ACTIVE_DEAL_STATUSES} from "@/modules/deals/deal.constants";
import {OPEN_LEAD_STATUSES} from "@/modules/leads/lead.constants";
import {RbacService} from "@/modules/rbac/rbac.service";

@Injectable()
export class DashboardService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly rbacService: RbacService,
    ) {}

    /**
     * Resolves the branchId to filter deal/task/payment queries by: a
     * branch-scoped role is always pinned to their own branch (BR-B1); a
     * company-wide role may optionally narrow to one branch via the query
     * param (BR-B3) — kept as a separate, later-checked branch so it can
     * never be mistaken for the sales-role restriction above it.
     */
    private resolveBranchId(user: AuthUser, branchId?: string): string | undefined {
        if (user.isBranchScoped) {
            return user.branchId ?? undefined;
        }

        return branchId;
    }

    /**
     * SM-A1: whether the shared/generic dashboard widgets (KPIs, revenue
     * trend, funnel, attention, recent activity) should show this viewer's
     * own pipeline instead of the whole branch's. dashboard.my_performance
     * is only in SALES_MANAGER's default bundle — the individual-
     * contributor role, as opposed to SALES_HEAD (branch-wide view +
     * team_snapshot) or a company-wide role. Keyed off the permission, not
     * roleName, same as every other role-shaped decision in this service —
     * see DEFAULT_ROLES' doc comment on why nothing compares against role
     * names at runtime.
     */
    private isSelfScoped(user: AuthUser): boolean {
        return hasPermission(user, "dashboard.my_performance");
    }

    async getKpis(user: AuthUser, projectId?: string, branchId?: string) {
        if (!user.companyId) throw new ForbiddenException("User does not belong to a company");
        const companyId = user.companyId;
        const effectiveBranchId = this.resolveBranchId(user, branchId);
        // SM-A1: a self-scoped viewer's revenue/deals/tasks KPIs count only
        // their own pipeline, not the whole branch's. availableUnits/
        // totalUnits stay company-wide below regardless — units have no
        // individual owner to scope them to.
        const selfScoped = this.isSelfScoped(user) ? { managerId: user.id } : {};
        const selfScopedTasks = this.isSelfScoped(user) ? { assignedToId: user.id } : {};

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const [revenueAgg, activeDealsCount, unitsAgg, overdueTasksCount] = await Promise.all([
            this.prisma.payment.aggregate({
                where: {
                    deal: { companyId, projectId, branchId: effectiveBranchId, ...selfScoped },
                    paidAt: { gte: startOfMonth },
                    deletedAt: null,
                },
                _sum: { amount: true },
            }),
            this.prisma.deal.count({
                where: { companyId, projectId, branchId: effectiveBranchId, ...selfScoped, status: { in: ACTIVE_DEAL_STATUSES } },
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
                    ...selfScopedTasks,
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
        const selfScoped = this.isSelfScoped(user) ? { managerId: user.id } : {};

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        const payments = await this.prisma.payment.findMany({
            where: {
                deal: { companyId: user.companyId, projectId, branchId: effectiveBranchId, ...selfScoped },
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
        const selfScoped = this.isSelfScoped(user);
        const in3Days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

        const [expiringDeals, urgentTasks] = await Promise.all([
            this.prisma.deal.findMany({
                where: {
                    companyId,
                    projectId,
                    branchId: effectiveBranchId,
                    ...(selfScoped ? { managerId: user.id } : {}),
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
                    ...(selfScoped ? { assignedToId: user.id } : {}),
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

        // SM-A1: a self-scoped viewer's feed is just their own actions, not
        // the whole branch's — takes over from the branch OR clause below
        // rather than narrowing it further (their own activity already
        // implies their own branch).
        if (this.isSelfScoped(user)) {
            where.userId = user.id;
        } else if (effectiveBranchId) {
            // Activity has no branchId of its own — filtered through
            // whichever entity it's attached to. An activity with none of
            // the three set never matches a branch filter, same as an
            // unassigned record would.
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

        const targetRoleIds = await this.rbacService.findRoleIdsWithPermission(companyId, "deals.manage", "deals.reassign");

        const managers = await this.prisma.user.findMany({
            where: {
                companyId,
                branchId,
                roleId: {in: targetRoleIds},
                isActive: true,
                deletedAt: null,
            },
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

    /**
     * SM-A2: a SALES_MANAGER's own "what needs doing today" view — leads
     * waiting on follow-up, tasks due today, and deals waiting on the client.
     * Not a new data model, just findAll's own filters (OPEN_LEAD_STATUSES,
     * ACTIVE_DEAL_STATUSES, due-today tasks) hardcoded to `self` instead of
     * left as an optional query param, so this is guaranteed to be the
     * manager's own work and not whatever they last filtered to.
     */
    async getMyWorkToday(user: AuthUser) {
        if (!user.companyId) throw new ForbiddenException("User does not belong to a company");
        const companyId = user.companyId;
        const managerId = user.id;

        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        const [leadsNeedingFollowUp, tasksDueToday, dealsWaitingOnClient] = await Promise.all([
            this.prisma.lead.findMany({
                where: {
                    companyId,
                    managerId,
                    deletedAt: null,
                    status: { in: OPEN_LEAD_STATUSES },
                    OR: [{ nextContactAt: null }, { nextContactAt: { lte: endOfToday } }],
                },
                select: { id: true, fullName: true, phone: true, status: true, nextContactAt: true },
                orderBy: { nextContactAt: { sort: "asc", nulls: "first" } },
                take: 10,
            }),
            this.prisma.task.findMany({
                where: {
                    companyId,
                    assignedToId: managerId,
                    deletedAt: null,
                    status: { in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS] },
                    dueDate: { lte: endOfToday },
                },
                select: { id: true, title: true, dueDate: true, status: true },
                orderBy: { dueDate: "asc" },
                take: 10,
            }),
            this.prisma.deal.findMany({
                where: {
                    companyId,
                    managerId,
                    deletedAt: null,
                    status: { in: ACTIVE_DEAL_STATUSES },
                },
                select: {
                    id: true, dealNumber: true, status: true, reservationExpiresAt: true,
                    client: { select: { id: true, fullName: true } },
                    unit: { select: { id: true, number: true } },
                },
                orderBy: { reservationExpiresAt: { sort: "asc", nulls: "last" } },
                take: 10,
            }),
        ]);

        return { leadsNeedingFollowUp, tasksDueToday, dealsWaitingOnClient };
    }

    /**
     * SM-D1: a SALES_MANAGER's own deal count and conversion rate over a
     * period — deliberately self-scoped, no visibility into teammates. Kept
     * separate from getTeamSnapshot (SALES_HEAD-only, cross-manager) so this
     * can never turn into an informal leaderboard.
     */
    async getMyPerformance(user: AuthUser, days: number) {
        if (!user.companyId) throw new ForbiddenException("User does not belong to a company");
        const companyId = user.companyId;
        const managerId = user.id;

        const since = new Date();
        since.setDate(since.getDate() - days);
        since.setHours(0, 0, 0, 0);

        const [leadsAssigned, dealsCreated, dealsWon] = await Promise.all([
            this.prisma.lead.count({
                where: { companyId, managerId, deletedAt: null, createdAt: { gte: since } },
            }),
            this.prisma.deal.count({
                where: { companyId, managerId, deletedAt: null, createdAt: { gte: since } },
            }),
            this.prisma.deal.count({
                where: {
                    companyId, managerId, deletedAt: null,
                    status: DealStatus.COMPLETED,
                    createdAt: { gte: since },
                },
            }),
        ]);

        return {
            periodDays: days,
            leadsAssigned,
            dealsCreated,
            dealsWon,
            conversionRate: leadsAssigned > 0 ? dealsWon / leadsAssigned : 0,
        };
    }

    /**
     * FIN-A1: a FINANCE user's collections overview — cash collected this
     * month, what's overdue and what's coming due in the next 30 days
     * (both from PaymentSchedule, the installment/invoice-like record —
     * see payment.prisma), the outstanding balance across every deal still
     * being paid off, and a cash-flow breakdown by payment method. Kept
     * separate from getKpis/getRevenueTrend above since those are the
     * generic per-viewer overview every role sees; this is the dedicated
     * reconciliation view gated by dashboard.finance_overview (FINANCE's
     * default bundle only).
     */
    async getFinanceOverview(user: AuthUser, branchId?: string) {
        if (!user.companyId) throw new ForbiddenException("User does not belong to a company");
        const companyId = user.companyId;
        const effectiveBranchId = this.resolveBranchId(user, branchId);

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        const dealScope: Prisma.DealWhereInput = { companyId, branchId: effectiveBranchId };

        const [collectedThisMonth, overdue, upcoming, outstanding, cashFlowByMethod] = await Promise.all([
            this.prisma.payment.aggregate({
                where: { deal: dealScope, paidAt: { gte: startOfMonth }, deletedAt: null },
                _sum: { amount: true },
            }),
            this.prisma.paymentSchedule.aggregate({
                where: { deal: dealScope, status: PaymentScheduleStatus.OVERDUE, deletedAt: null },
                _sum: { amount: true, paidAmount: true },
                _count: { _all: true },
            }),
            this.prisma.paymentSchedule.aggregate({
                where: {
                    deal: dealScope,
                    status: PaymentScheduleStatus.PENDING,
                    dueDate: { lte: in30Days },
                    deletedAt: null,
                },
                _sum: { amount: true, paidAmount: true },
                _count: { _all: true },
            }),
            this.prisma.paymentSchedule.aggregate({
                where: {
                    deal: dealScope,
                    status: { in: [PaymentScheduleStatus.PENDING, PaymentScheduleStatus.PARTIAL, PaymentScheduleStatus.OVERDUE] },
                    deletedAt: null,
                },
                _sum: { amount: true, paidAmount: true },
            }),
            this.prisma.payment.groupBy({
                by: ["paymentMethod"],
                where: { deal: dealScope, deletedAt: null },
                _sum: { amount: true },
            }),
        ]);

        const remaining = (agg: { _sum: { amount: unknown; paidAmount: unknown } }) =>
            Number(agg._sum.amount ?? 0) - Number(agg._sum.paidAmount ?? 0);

        return {
            collectedThisMonth: collectedThisMonth._sum.amount ?? 0,
            outstandingBalance: remaining(outstanding),
            overdue: { amount: remaining(overdue), count: overdue._count._all },
            upcoming: { amount: remaining(upcoming), count: upcoming._count._all },
            cashFlowByMethod: Object.values(PaymentMethod).map((method) => ({
                method,
                amount: cashFlowByMethod.find((c) => c.paymentMethod === method)?._sum.amount ?? 0,
            })),
        };
    }

    /**
     * Lead → deal → won conversion funnel, the first thing a pilot sponsor
     * asks a CRM for and — until now — the one number this dashboard
     * couldn't produce (getKpis/getMyPerformance only ever counted a single
     * stage in isolation). Lead status counts and deal status counts are
     * necessarily two separate breakdowns (a lead and its resulting deal are
     * different rows), so the funnel below is assembled from both rather
     * than a single groupBy.
     */
    async getFunnel(user: AuthUser, projectId?: string, branchId?: string) {
        if (!user.companyId) throw new ForbiddenException("User does not belong to a company");
        const companyId = user.companyId;
        const effectiveBranchId = this.resolveBranchId(user, branchId);
        // SM-A1: a self-scoped viewer's funnel counts only leads/deals they
        // manage, not the whole branch's.
        const selfScoped = this.isSelfScoped(user) ? { managerId: user.id } : {};

        const [leadCounts, dealCounts, wonDeals, totalLeads] = await Promise.all([
            this.prisma.lead.groupBy({
                by: ["status"],
                where: { companyId, branchId: effectiveBranchId, ...selfScoped, deletedAt: null },
                _count: { _all: true },
            }),
            this.prisma.deal.groupBy({
                by: ["status"],
                where: { companyId, projectId, branchId: effectiveBranchId, ...selfScoped },
                _count: { _all: true },
            }),
            this.prisma.deal.count({
                where: { companyId, projectId, branchId: effectiveBranchId, ...selfScoped, status: DealStatus.COMPLETED },
            }),
            this.prisma.lead.count({
                where: { companyId, branchId: effectiveBranchId, ...selfScoped, deletedAt: null },
            }),
        ]);

        const leadsByStatus = Object.values(LeadStatus).map((status) => ({
            status,
            count: leadCounts.find((c) => c.status === status)?._count._all ?? 0,
        }));

        const dealsByStatus = Object.values(DealStatus).map((status) => ({
            status,
            count: dealCounts.find((c) => c.status === status)?._count._all ?? 0,
        }));

        return {
            leadsByStatus,
            dealsByStatus,
            totalLeads,
            totalDeals: dealCounts.reduce((sum, c) => sum + c._count._all, 0),
            dealsWon: wonDeals,
            leadToDealConversionRate: totalLeads > 0
                ? dealCounts.reduce((sum, c) => sum + c._count._all, 0) / totalLeads
                : 0,
            leadToWonConversionRate: totalLeads > 0 ? wonDeals / totalLeads : 0,
        };
    }

    /**
     * Excel export of the funnel above — the second thing a pilot sponsor
     * asks for after "what's our conversion rate", right before "can I get
     * this in Excel". Reuses the xlsx dependency already in this project
     * (see units-import.service.ts) rather than adding a CSV library for
     * the same job.
     */
    async exportFunnelXlsx(user: AuthUser, projectId?: string, branchId?: string): Promise<Buffer> {
        const funnel = await this.getFunnel(user, projectId, branchId);

        const workbook = XLSX.utils.book_new();

        const leadsSheet = XLSX.utils.json_to_sheet(
            funnel.leadsByStatus.map((row) => ({ Status: row.status, Leads: row.count })),
        );
        XLSX.utils.book_append_sheet(workbook, leadsSheet, "Leads by status");

        const dealsSheet = XLSX.utils.json_to_sheet(
            funnel.dealsByStatus.map((row) => ({ Status: row.status, Deals: row.count })),
        );
        XLSX.utils.book_append_sheet(workbook, dealsSheet, "Deals by status");

        const summarySheet = XLSX.utils.json_to_sheet([
            { Metric: "Total leads", Value: funnel.totalLeads },
            { Metric: "Total deals", Value: funnel.totalDeals },
            { Metric: "Deals won", Value: funnel.dealsWon },
            { Metric: "Lead → deal conversion rate", Value: funnel.leadToDealConversionRate },
            { Metric: "Lead → won conversion rate", Value: funnel.leadToWonConversionRate },
        ]);
        XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

        return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
    }
}
