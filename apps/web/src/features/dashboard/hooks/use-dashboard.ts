import {useQuery} from "@tanstack/react-query";
import {
    getAttentionItems,
    getDashboardKpis,
    getRecentActivity,
    getRevenueTrend,
    getUnitsSummary
} from "@/features/dashboard/api/dashboard.api.ts";
import {getDealStatusSummary} from "@/features/deals/api/deals.api.ts";

export function useDashboard(projectId?: string) {
    return {
        kpis: useQuery({ queryKey: ["dashboard", "kpis", { projectId }], queryFn: () => getDashboardKpis(projectId) }),
        revenueTrend: useQuery({ queryKey: ["dashboard", "revenue-trend", { projectId }], queryFn: () => getRevenueTrend(projectId) }),
        unitsSummary: useQuery({ queryKey: ["dashboard", "units-summary", { projectId }], queryFn: () => getUnitsSummary(projectId) }),
        attention: useQuery({ queryKey: ["dashboard", "attention", { projectId }], queryFn: () => getAttentionItems(projectId) }),
        recentActivity: useQuery({ queryKey: ["dashboard", "recent-activity", { projectId }], queryFn: () => getRecentActivity(projectId) }),
        dealsStatus: useQuery({ queryKey: ["deals", "status-summary", { projectId }], queryFn: () => getDealStatusSummary(projectId) }),
    };
}