import {useQuery} from "@tanstack/react-query";
import {
    getAttentionItems,
    getBranchComparison,
    getDashboardKpis,
    getRecentActivity,
    getRevenueTrend,
    getTeamSnapshot,
    getUnitsSummary
} from "@/features/dashboard/api/dashboard.api.ts";
import {getDealStatusSummary} from "@/features/deals/api/deals.api.ts";

export function useDashboard(projectId?: string, branchId?: string) {
    return {
        kpis: useQuery({ queryKey: ["dashboard", "kpis", { projectId, branchId }], queryFn: () => getDashboardKpis(projectId, branchId) }),
        revenueTrend: useQuery({ queryKey: ["dashboard", "revenue-trend", { projectId, branchId }], queryFn: () => getRevenueTrend(projectId, branchId) }),
        unitsSummary: useQuery({ queryKey: ["dashboard", "units-summary", { projectId }], queryFn: () => getUnitsSummary(projectId) }),
        attention: useQuery({ queryKey: ["dashboard", "attention", { projectId, branchId }], queryFn: () => getAttentionItems(projectId, branchId) }),
        recentActivity: useQuery({ queryKey: ["dashboard", "recent-activity", { projectId, branchId }], queryFn: () => getRecentActivity(projectId, branchId) }),
        dealsStatus: useQuery({ queryKey: ["deals", "status-summary", { projectId, branchId }], queryFn: () => getDealStatusSummary(projectId, branchId) }),
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
export function useTeamSnapshot(enabled: boolean) {
    return useQuery({
        queryKey: ["dashboard", "team-snapshot"],
        queryFn: getTeamSnapshot,
        enabled,
    });
}
