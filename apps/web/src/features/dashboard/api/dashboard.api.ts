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

export async function getDashboardKpis(projectId?: string) {
    const response = await api.get<DashboardKpis>("/dashboard/kpis", { params: { projectId } });
    return response.data;
}
export async function getRevenueTrend(projectId?: string) {
    const response = await api.get<RevenueTrendPoint[]>("/dashboard/revenue-trend", { params: { projectId } });
    return response.data;
}
export async function getUnitsSummary(projectId?: string) {
    const response = await api.get<UnitsSummaryItem[]>("/dashboard/units-summary", { params: { projectId } });
    return response.data;
}
export async function getAttentionItems(projectId?: string) {
    const response = await api.get<AttentionItems>("/dashboard/attention", { params: { projectId } });
    return response.data;
}
export async function getRecentActivity(projectId?: string) {
    const response = await api.get<RecentActivity[]>("/dashboard/recent-activity", { params: { projectId } });
    return response.data;
}