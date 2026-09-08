import {api} from "@/lib/api";
import type {PaginatedResponse} from "@/lib/api-types";
import type {User, UserRole} from "../types/user.types";

export type GetUsersParams = {
    page?: number;
    limit?: number;
    search?: string;
    role?: UserRole;
    isActive?: boolean;
    branchId?: string;
};

export type UserRoleSummaryItem = {
    role: UserRole;
    count: number;
    sample: { id: string; fullName: string }[];
};

export async function getUsers(params?: GetUsersParams) {
    const response = await api.get<PaginatedResponse<User>>("/users", { params });
    return response.data;
}

export async function getUser(id: string) {
    const response = await api.get<User>(`/users/${id}`);
    return response.data;
}

export type CreateUserPayload = {
    fullName: string;
    email: string;
    phone?: string;
    password: string;
    role: UserRole;
    // Required for branch-scoped roles (SALES_HEAD, SALES_MANAGER); must be
    // absent for company-wide roles.
    branchId?: string;
};

export async function createUser(payload: CreateUserPayload) {
    const response = await api.post<User>("/users", payload);
    return response.data;
}

export type UpdateUserPayload = Partial<Omit<CreateUserPayload, "password">> & {
    isActive?: boolean;
};

export async function updateUser(id: string, payload: UpdateUserPayload) {
    const response = await api.patch<User>(`/users/${id}`, payload);
    return response.data;
}

export async function updateUserPassword(id: string, password: string) {
    const response = await api.patch(`/users/${id}/password`, { password });
    return response.data;
}

export async function deleteUser(id: string) {
    await api.delete(`/users/${id}`);
}

export type DeactivationImpact = {
    openLeads: number;
    activeDeals: number;
};

export async function getDeactivationImpact(id: string) {
    const response = await api.get<DeactivationImpact>(`/users/${id}/deactivation-impact`);
    return response.data;
}

// The reassignment-aware counterpart to deleteUser() above — same effect
// (soft-delete/deactivate), plus an optional reassignToId that moves the
// target's open leads and active deals to a replacement manager first.
export async function deactivateUser(id: string, reassignToId?: string) {
    await api.post(`/users/${id}/deactivate`, reassignToId ? {reassignToId} : {});
}

export async function getUserRoleSummary() {
    const response = await api.get<UserRoleSummaryItem[]>("/users/role-summary");
    return response.data;
}

export type BranchTransferImpact = {
    openLeads: number;
    activeDeals: number;
};

export async function getBranchTransferImpact(id: string) {
    const response = await api.get<BranchTransferImpact>(`/users/${id}/branch-transfer-impact`);
    return response.data;
}

// BR-A3: moves a branch-scoped user to another branch. Optionally reassigns
// their open leads/active deals to a replacement — same shape as
// deactivateUser's reassignToId above.
export async function transferUserBranch(id: string, branchId: string, reassignToId?: string) {
    const response = await api.post<User>(`/users/${id}/transfer-branch`, {
        branchId,
        ...(reassignToId ? {reassignToId} : {}),
    });
    return response.data;
}