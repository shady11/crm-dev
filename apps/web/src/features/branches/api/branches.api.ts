import {api} from "@/lib/api";
import type {PaginatedResponse} from "@/lib/api-types";
import type {Branch} from "../types/branch.types";

export type GetBranchesParams = {
    page?: number;
    limit?: number;
    search?: string;
    includeDeactivated?: boolean;
};

export async function getBranches(params?: GetBranchesParams) {
    const response = await api.get<PaginatedResponse<Branch>>("/branches", {params});
    return response.data;
}

export async function getBranch(id: string) {
    const response = await api.get<Branch>(`/branches/${id}`);
    return response.data;
}

export type CreateBranchPayload = {
    name: string;
    city?: string;
    address?: string;
    phone?: string;
};

export async function createBranch(payload: CreateBranchPayload) {
    const response = await api.post<Branch>("/branches", payload);
    return response.data;
}

export type UpdateBranchPayload = Partial<CreateBranchPayload>;

export async function updateBranch(id: string, payload: UpdateBranchPayload) {
    const response = await api.patch<Branch>(`/branches/${id}`, payload);
    return response.data;
}

// Deactivate/reactivate are separate endpoints rather than a status field, so
// a mistyped payload cannot turn one into the other. There is no delete
// endpoint at all — a branch is never hard-deleted.
export async function deactivateBranch(id: string) {
    const response = await api.post<Branch>(`/branches/${id}/deactivate`);
    return response.data;
}

export async function reactivateBranch(id: string) {
    const response = await api.post<Branch>(`/branches/${id}/reactivate`);
    return response.data;
}
