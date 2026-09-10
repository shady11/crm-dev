import {api} from "@/lib/api";
import type {UnitStatus} from "@/features/units/types/unit.types.ts";

export type DashboardKpis = {
    revenueThisMonth: number;
    activeDealsCount: number;
    availableUnits: number;
    totalUnits: number;
    overdueTasksCount: number;
};

export type RevenueTrendPoint = { month: string; revenue: number };
export type UnitsSummaryItem = { status: UnitStatus; count: number };

export type AttentionDeal = {
    id: string; dealNumber: string; reservationExpiresAt: string;
    client: { fullName: string };
};
export type AttentionTask = {
    id: string; title: string; dueDate: string;
    assignedTo: { id: string; fullName: string };
};
export type AttentionItems = { expiringDeals: AttentionDeal[]; urgentTasks: AttentionTask[] };

export type RecentActivity = {
    id: string; title: string; description: string | null; type: string; createdAt: string;
    user: { id: string; fullName: string } | null;
    deal: { id: string; dealNumber: string } | null;
};

export async function getDashboardKpis(projectId?: string, branchId?: string) {
    const response = await api.get<DashboardKpis>("/dashboard/kpis", { params: { projectId, branchId } });
    return response.data;
}
export async function getRevenueTrend(projectId?: string, branchId?: string) {
    const response = await api.get<RevenueTrendPoint[]>("/dashboard/revenue-trend", { params: { projectId, branchId } });
    return response.data;
}
export async function getUnitsSummary(projectId?: string) {
    const response = await api.get<UnitsSummaryItem[]>("/dashboard/units-summary", { params: { projectId } });
    return response.data;
}
export async function getAttentionItems(projectId?: string, branchId?: string) {
    const response = await api.get<AttentionItems>("/dashboard/attention", { params: { projectId, branchId } });
    return response.data;
}
export async function getRecentActivity(projectId?: string, branchId?: string) {
    const response = await api.get<RecentActivity[]>("/dashboard/recent-activity", { params: { projectId, branchId } });
    return response.data;
}

// BR-E1: per-branch deal count and revenue comparison, COMPANY_ADMIN only.
export type BranchComparisonItem = { branchId: string; branchName: string; dealCount: number; revenue: number };

export async function getBranchComparison() {
    const response = await api.get<BranchComparisonItem[]>("/dashboard/branch-comparison");
    return response.data;
}

// SH-A2: a SALES_HEAD's own-team snapshot — counts and a last-activity
// timestamp per SALES_MANAGER on their branch, SALES_HEAD only.
export type TeamSnapshotItem = {
    manager: { id: string; fullName: string; email: string };
    openLeads: number;
    activeDeals: number;
    tasksDue: number;
    lastActivityAt: string | null;
};

export async function getTeamSnapshot() {
    const response = await api.get<TeamSnapshotItem[]>("/dashboard/team-snapshot");
    return response.data;
}

// SM-A2: a SALES_MANAGER's own "what needs doing today" view, SALES_MANAGER
// only — leads waiting on follow-up, tasks due today, and deals waiting on
// the client, all hardcoded to the caller's own records.
export type MyWorkLead = {
    id: string; fullName: string; phone: string; status: string; nextContactAt: string | null;
};
export type MyWorkTask = { id: string; title: string; dueDate: string | null; status: string };
export type MyWorkDeal = {
    id: string; dealNumber: string; status: string; reservationExpiresAt: string | null;
    client: { id: string; fullName: string };
    unit: { id: string; number: string };
};
export type MyWorkToday = {
    leadsNeedingFollowUp: MyWorkLead[];
    tasksDueToday: MyWorkTask[];
    dealsWaitingOnClient: MyWorkDeal[];
};

export async function getMyWorkToday() {
    const response = await api.get<MyWorkToday>("/dashboard/my-work-today");
    return response.data;
}

// SM-D1: a SALES_MANAGER's own deal count and conversion rate over a period,
// self-scoped only — SALES_MANAGER only.
export type MyPerformance = {
    periodDays: number;
    leadsAssigned: number;
    dealsCreated: number;
    dealsWon: number;
    conversionRate: number;
};

export async function getMyPerformance(days?: number) {
    const response = await api.get<MyPerformance>("/dashboard/my-performance", { params: { days } });
    return response.data;
}

// Lead → deal → won conversion funnel.
export type FunnelStatusCount = { status: string; count: number };
export type Funnel = {
    leadsByStatus: FunnelStatusCount[];
    dealsByStatus: FunnelStatusCount[];
    totalLeads: number;
    totalDeals: number;
    dealsWon: number;
    leadToDealConversionRate: number;
    leadToWonConversionRate: number;
};

export async function getFunnel(projectId?: string, branchId?: string) {
    const response = await api.get<Funnel>("/dashboard/funnel", { params: { projectId, branchId } });
    return response.data;
}

export async function downloadFunnelExport(projectId?: string, branchId?: string) {
    const response = await api.get<Blob>("/dashboard/funnel/export", {
        params: { projectId, branchId },
        responseType: "blob",
    });

    const url = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = `funnel-${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}