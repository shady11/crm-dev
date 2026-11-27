import {useQuery} from "@tanstack/react-query";
import {
    getAttentionItems,
    getBranchComparison,
    getFinanceOverview,
    getFunnel,
    getInventoryByProject,
    getManagerPerformance,
    getSalesSummary,
    getMyWorkToday,
    getRecentActivity,
    getRevenueTrend,
    getTeamPerformance,
    getTeamSnapshot,
    type DashboardPeriod,
} from "@/features/dashboard/api/dashboard.api.ts";
import {getDealStatusSummary} from "@/features/deals/api/deals.api.ts";

// funnelManagerId narrows only the funnel — the one widget a Sales Head
// can split by manager.
export function useDashboard(projectId?: string, branchId?: string, funnelManagerId?: string) {
    return {
        revenueTrend: useQuery({ queryKey: ["dashboard", "revenue-trend", { projectId, branchId }], queryFn: () => getRevenueTrend(projectId, branchId) }),
        attention: useQuery({ queryKey: ["dashboard", "attention", { projectId, branchId }], queryFn: () => getAttentionItems(projectId, branchId) }),
        recentActivity: useQuery({ queryKey: ["dashboard", "recent-activity", { projectId, branchId }], queryFn: () => getRecentActivity(projectId, branchId) }),
        // mine: true — a self-scoped viewer (SALES_MANAGER) sees only their
        // own deals here; ignored server-side for every other role.
        dealsStatus: useQuery({ queryKey: ["deals", "status-summary", { projectId, branchId }], queryFn: () => getDealStatusSummary(projectId, branchId, true) }),
        funnel: useQuery({
            queryKey: ["dashboard", "funnel", { projectId, branchId, funnelManagerId }],
            queryFn: () => getFunnel(projectId, branchId, funnelManagerId),
        }),
    };
}

// BR-E1, COMPANY_ADMIN only — kept as its own hook since it's a separate
// admin-only endpoint, not part of the per-viewer dashboard query set above.
export function useBranchComparison(enabled: boolean) {
    return useQuery({
        queryKey: ["dashboard", "branch-comparison"],
        queryFn: getBranchComparison,
        enabled,
    });
}

// SH-A2, SALES_HEAD only — same reasoning as useBranchComparison above: a
// separate role-gated endpoint, not part of the shared dashboard query set.
// branchId narrows the owner's company-wide snapshot; a Sales Head's is
// always their own branch.
export function useTeamSnapshot(enabled: boolean, branchId?: string) {
    return useQuery({
        queryKey: ["dashboard", "team-snapshot", { branchId }],
        queryFn: () => getTeamSnapshot(branchId),
        enabled,
    });
}

// SALES_HEAD only, for the "My team" page.
export function useTeamPerformance(enabled: boolean, days: number) {
    return useQuery({
        queryKey: ["dashboard", "team-performance", days],
        queryFn: () => getTeamPerformance(days),
        enabled,
    });
}

// SM-A2, SALES_MANAGER only — same reasoning as useTeamSnapshot above.
export function useMyWorkToday(enabled: boolean) {
    return useQuery({
        queryKey: ["dashboard", "my-work-today"],
        queryFn: getMyWorkToday,
        enabled,
    });
}

// FIN-A1, FINANCE only — same reasoning as useBranchComparison above.
export function useFinanceOverview(enabled: boolean, branchId?: string, projectId?: string) {
    return useQuery({
        queryKey: ["dashboard", "finance-overview", { branchId, projectId }],
        queryFn: () => getFinanceOverview(branchId, projectId),
        enabled,
    });
}

// The period headline numbers and collections, scoped like the KPIs.
export function useSalesSummary(period: DashboardPeriod, projectId?: string, branchId?: string) {
    return useQuery({
        queryKey: ["dashboard", "sales-summary", { period, projectId, branchId }],
        queryFn: () => getSalesSummary(period, projectId, branchId),
    });
}

// Company-wide stock per project (BR-C1).
export function useInventoryByProject(projectId?: string) {
    return useQuery({
        queryKey: ["dashboard", "inventory-by-project", { projectId }],
        queryFn: () => getInventoryByProject(projectId),
    });
}

// Team lead / owner only.
export function useManagerPerformance(enabled: boolean, period: DashboardPeriod, projectId?: string, branchId?: string) {
    return useQuery({
        queryKey: ["dashboard", "manager-performance", { period, projectId, branchId }],
        queryFn: () => getManagerPerformance(period, projectId, branchId),
        enabled,
    });
}
