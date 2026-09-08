import {api} from "@/lib/api";
import type {PaginatedResponse} from "@/lib/api-types";
import type {LeadStatus} from "../types/lead.types";

export type LeadManager = { id: string; fullName: string; email: string } | null;
export type LeadClient = { id: string; fullName: string; phone: string } | null;

export interface Lead {
    id: string;
    fullName: string;
    phone: string;
    email: string | null;
    source: string | null;
    status: LeadStatus;
    comment: string | null;
    nextContactAt: string | null;
    lastContactAt: string | null;
    assignedAt: string | null;
    companyId: string;
    branchId: string | null;
    manager: LeadManager;
    client: LeadClient;
    createdAt: string;
    updatedAt: string;
}

export type GetLeadsParams = {
    page?: number;
    limit?: number;
    search?: string;
    status?: LeadStatus;
    managerId?: string;
    // Admin-only cross-branch filter (BR-B3); ignored server-side for a
    // branch-scoped caller, whose own branch filter already takes precedence.
    branchId?: string;
};

export async function getLeads(params?: GetLeadsParams) {
    const response = await api.get<PaginatedResponse<Lead>>("/leads", { params });
    return response.data;
}

export async function getLead(id: string) {
    const response = await api.get<Lead>(`/leads/${id}`);
    return response.data;
}

export type CreateLeadPayload = {
    fullName: string;
    phone: string;
    email?: string;
    source?: string;
    status?: LeadStatus;
    comment?: string;
    managerId?: string;
};

export type UpdateLeadPayload = Partial<CreateLeadPayload>;

export async function createLead(payload: CreateLeadPayload) {
    const response = await api.post<Lead>("/leads", payload);
    return response.data;
}

export async function updateLead(id: string, payload: UpdateLeadPayload) {
    const response = await api.patch<Lead>(`/leads/${id}`, payload);
    return response.data;
}

export async function deleteLead(id: string) {
    await api.delete(`/leads/${id}`);
}

export type ConvertLeadPayload = {
    clientId?: string;
};

export async function convertLead(id: string, payload?: ConvertLeadPayload) {
    const response = await api.post<Lead>(`/leads/${id}/convert`, payload ?? {});
    return response.data;
}

export type DuplicateLeadCheckResult = {
    leads: { id: string; fullName: string; phone: string; status: string; createdAt: string }[];
    clients: { id: string; fullName: string; phone: string; createdAt: string }[];
    // BR-D2: populated only for a COMPANY_ADMIN caller — a heads-up that this
    // phone already exists as a client at a different branch.
    crossBranchClient: { id: string; branchId: string | null } | null;
};

// BR-D1: COMPANY_ADMIN-only handoff of a lead to another branch.
export async function transferLeadBranch(id: string, branchId: string) {
    const response = await api.post<Lead>(`/leads/${id}/transfer-branch`, { branchId });
    return response.data;
}

// SH-A1: SALES_HEAD moving a lead between their own team's SALES_MANAGERs.
export async function reassignLeadManager(id: string, managerId: string) {
    const response = await api.post<Lead>(`/leads/${id}/reassign`, { managerId });
    return response.data;
}

export async function checkLeadDuplicates(phone: string, excludeLeadId?: string) {
    const response = await api.get<DuplicateLeadCheckResult>("/leads/duplicates", {
        params: { phone, excludeLeadId },
    });
    return response.data;
}
