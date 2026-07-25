import {api} from "@/lib/api";
import type {PaginatedResponse} from "@/lib/api-types";
import type {Client} from "../types/client.types";

export type GetClientsParams = {
    page?: number;
    limit?: number;
    search?: string;
    projectId?: string;
};

export async function getClients(params?: GetClientsParams) {
    const response = await api.get<PaginatedResponse<Client>>("/clients", { params });
    return response.data;
}

export async function getClient(id: string) {
    const response = await api.get<Client>(`/clients/${id}`);
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