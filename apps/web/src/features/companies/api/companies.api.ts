import {api} from "@/lib/api";
import type {PaginatedResponse} from "@/lib/api-types";
import type {ImpersonateResponse} from "@/features/auth/types/auth.types";
import type {Company, CompanyDetails} from "../types/company.types";

// "deleted" lists deleted companies instead, to restore one (SA-3).
export type CompanyStatusFilter = "all" | "active" | "suspended" | "deleted";

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

// Self-service for a COMPANY_ADMIN editing their own tenant — scoped server-side to the
// caller's own companyId, never a client-supplied id.
export type UpdateOwnCompanyPayload = Pick<CreateCompanyPayload, "name" | "currency" | "locale" | "timezone"> & {
    reservationDefaultDays?: number;
    reservationMaxDays?: number;
    reservationMaxExtensions?: number;
    // CA-4: what contracts and receipts print. An empty string clears a field.
    legalName?: string;
    taxId?: string;
    address?: string;
    phone?: string;
    signatoryName?: string;
    signatoryTitle?: string;
};

export async function getOwnCompany() {
    const response = await api.get<Company>("/companies/me");
    return response.data;
}

/** SA-8: which first steps the caller's company has done. */
export type CompanySetupProgress = {branch: boolean; legalDetails: boolean; project: boolean; team: boolean};

export async function getCompanySetupProgress() {
    const response = await api.get<CompanySetupProgress>("/companies/me/setup");
    return response.data;
}

export async function updateOwnCompany(payload: Partial<UpdateOwnCompanyPayload>) {
    const response = await api.patch<Company>("/companies/me", payload);
    return response.data;
}

// Suspend and resume are separate endpoints rather than a status field, so a
// mistyped payload cannot turn one into the other.
/** SA-12: the optional reason is kept in the audit log. */
export async function suspendCompany(id: string, reason?: string) {
    const response = await api.post<Company>(`/companies/${id}/suspend`, reason ? {reason} : {});
    return response.data;
}

export async function resumeCompany(id: string) {
    const response = await api.post<Company>(`/companies/${id}/resume`);
    return response.data;
}

/** SA-3: undoes a deletion; the company comes back suspended. */
export async function restoreCompany(id: string) {
    const response = await api.post<Company>(`/companies/${id}/restore`);
    return response.data;
}

export async function deleteCompany(id: string) {
    const response = await api.delete<{success: boolean}>(`/companies/${id}`);
    return response.data;
}

// Deactivate/reactivate are separate endpoints rather than an isActive field,
// for the same reason suspend/resume are.
export type DeactivationPreview = {
    user: {id: string; fullName: string; branchId: string | null};
    leads: number;
    deals: number;
    tasks: number;
    /** The last active user in the company who can manage users. */
    isLastAdmin: boolean;
};

/** SA-7: what deactivating them would leave behind. */
export async function getDeactivationPreview(companyId: string, userId: string) {
    const response = await api.get<DeactivationPreview>(`/companies/${companyId}/users/${userId}/deactivation-preview`);
    return response.data;
}

export async function deactivateCompanyUser(
    companyId: string,
    userId: string,
    options: {reassignToId?: string; confirmLastAdmin?: boolean} = {},
) {
    const response = await api.post<{success: boolean; handedOver?: {leads: number; deals: number; tasks: number}}>(
        `/companies/${companyId}/users/${userId}/deactivate`,
        options,
    );
    return response.data;
}

export async function reactivateCompanyUser(companyId: string, userId: string) {
    const response = await api.post<{success: boolean}>(
        `/companies/${companyId}/users/${userId}/reactivate`,
    );
    return response.data;
}

export type ResetCompanyUserPasswordResult = {
    email: string;
    /** Shown once, never readable again. */
    generatedPassword: string;
};

export async function resetCompanyUserPassword(companyId: string, userId: string) {
    const response = await api.post<ResetCompanyUserPasswordResult>(
        `/companies/${companyId}/users/${userId}/reset-password`,
    );
    return response.data;
}

export async function impersonateCompanyUser(companyId: string, userId: string) {
    const response = await api.post<ImpersonateResponse>(
        `/companies/${companyId}/users/${userId}/impersonate`,
    );
    return response.data;
}
