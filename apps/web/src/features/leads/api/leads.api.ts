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
};

export async function checkLeadDuplicates(phone: string, excludeLeadId?: string) {
    const response = await api.get<DuplicateLeadCheckResult>("/leads/duplicates", {
        params: { phone, excludeLeadId },
    });
    return response.data;
}
