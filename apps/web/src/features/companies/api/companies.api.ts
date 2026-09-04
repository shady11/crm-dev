import {api} from "@/lib/api";
import type {PaginatedResponse} from "@/lib/api-types";
import type {Company, CompanyDetails} from "../types/company.types";

export type CompanyStatusFilter = "all" | "active" | "suspended";

export type GetCompaniesParams = {
    page?: number;
    limit?: number;
    search?: string;
    status?: Exclude<CompanyStatusFilter, "all">;
};

export async function getCompanies(params?: GetCompaniesParams) {
    const response = await api.get<PaginatedResponse<Company>>("/companies", {params});
    return response.data;
}

export async function getCompany(id: string) {
    const response = await api.get<CompanyDetails>(`/companies/${id}`);
    return response.data;
}

export type CreateCompanyPayload = {
    name: string;
    phone?: string;
    address?: string;
    currency?: string;
    locale?: string;
    timezone?: string;
    adminFullName: string;
    adminEmail: string;
    adminPassword?: string;
};

export type CreateCompanyResult = {
    company: Company;
    admin: {
        email: string;
        /** Present only when the server generated it — shown once, never readable again. */
        generatedPassword?: string;
    };
};

export async function createCompany(payload: CreateCompanyPayload) {
    const response = await api.post<CreateCompanyResult>("/companies", payload);
    return response.data;
}

export type UpdateCompanyPayload = Partial<
    Pick<CreateCompanyPayload, "name" | "phone" | "address" | "currency" | "locale" | "timezone">
>;

export async function updateCompany(id: string, payload: UpdateCompanyPayload) {
    const response = await api.patch<Company>(`/companies/${id}`, payload);
    return response.data;
}

// Suspend and resume are separate endpoints rather than a status field, so a
// mistyped payload cannot turn one into the other.
export async function suspendCompany(id: string) {
    const response = await api.post<Company>(`/companies/${id}/suspend`);
    return response.data;
}

export async function resumeCompany(id: string) {
    const response = await api.post<Company>(`/companies/${id}/resume`);
    return response.data;
}

export async function deleteCompany(id: string) {
    const response = await api.delete<{success: boolean}>(`/companies/${id}`);
    return response.data;
}
