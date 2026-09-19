import {api} from "@/lib/api";

export type ActiveImpersonationSession = {
    id: string;
    startedAt: string;
    expiresAt: string;
    superAdmin: {id: string; email: string; fullName: string};
    targetUser: {id: string; email: string; fullName: string};
    company: {id: string; name: string};
};

export type SuperAdminDashboardStats = {
    companies: {total: number; active: number; suspended: number};
    totalUsers: number;
    activeImpersonations: ActiveImpersonationSession[];
};

export async function getSuperAdminDashboardStats() {
    const response = await api.get<SuperAdminDashboardStats>("/companies/dashboard-stats");
    return response.data;
}
