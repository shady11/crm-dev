import {api} from "@/lib/api";
import type {PaginatedResponse} from "@/lib/api-types";
import type {Client} from "../types/client.types";
import type {DealStatus} from "@/features/deals/types/deal.types";
import type {LeadStatus} from "@/features/leads/types/lead.types";

// Kept in sync with CLIENT_SORTABLE_FIELDS in the API's query-clients.dto.ts.
export type ClientSortField = "fullName" | "phone" | "email" | "createdAt";

export type GetClientsParams = {
    page?: number;
    limit?: number;
    search?: string;
    projectId?: string;
    // Admin-only cross-branch filter (BR-B3); ignored server-side for a
    // branch-scoped caller, whose own branch filter already takes precedence.
    branchId?: string;
    sortBy?: ClientSortField;
    sortOrder?: "asc" | "desc";
};

export async function getClients(params?: GetClientsParams) {
    const response = await api.get<PaginatedResponse<Client>>("/clients", { params });
    return response.data;
}

export type ClientLeadSummary = {
    id: string;
    fullName: string;
    phone: string;
    source: string | null;
    status: LeadStatus;
    createdAt: string;
};

export type ClientDealUnitSummary = {
    id: string;
    number: string;
    type: string;
    status: string;
    rooms: number | null;
    area: number;
    price: number;
    floor: { id: string; number: number } | null;
    entrance: { id: string; name: string } | null;
    block: { id: string; name: string } | null;
    project: { id: string; name: string } | null;
};

export type ClientDealSummary = {
    id: string;
    dealNumber: string;
    status: DealStatus;
    salePrice: number;
    unit: ClientDealUnitSummary;
    createdAt: string;
};

// GET /clients/:id returns leads/deals as full (slim) arrays, unlike the list
// endpoint which returns a `_count` — these are genuinely different shapes.
export type ClientDetails = Omit<Client, "_count"> & {
    leads: ClientLeadSummary[];
    deals: ClientDealSummary[];
};

export async function getClient(id: string) {
    const response = await api.get<ClientDetails>(`/clients/${id}`);
    return response.data;
}

export type CreateClientPayload = {
    fullName: string;
    phone: string;
    whatsapp?: string;
    email?: string;
    passport?: string;
    pin?: string;
};

export type UpdateClientPayload = Partial<CreateClientPayload>;

export async function createClient(payload: CreateClientPayload) {
    const response = await api.post<Client>("/clients", payload);
    return response.data;
}

export async function updateClient(id: string, payload: UpdateClientPayload) {
    const response = await api.patch<Client>(`/clients/${id}`, payload);
    return response.data;
}

export async function deleteClient(id: string) {
    await api.delete(`/clients/${id}`);
}

export async function searchClients(search: string) {
    const response = await api.get<PaginatedResponse<Client>>("/clients", {
        params: { search, limit: 10 },
    });
    return response.data;
}

// BR-D1: COMPANY_ADMIN-only handoff of a client to another branch.
export async function transferClientBranch(id: string, branchId: string) {
    const response = await api.post<Client>(`/clients/${id}/transfer-branch`, { branchId });
    return response.data;
}