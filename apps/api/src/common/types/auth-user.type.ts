import {UserRole} from "@/generated/prisma/enums";

export type AuthCompanySummary = {
    id: string;
    name: string;
    currency: string | null;
    locale: string | null;
    timezone: string | null;
};

export type AuthBranchSummary = {
    id: string;
    name: string;
    city: string | null;
};

export type AuthImpersonationSummary = {
    sessionId: string;
    superAdminId: string;
    superAdminEmail: string;
    superAdminName: string;
};

export type AuthUser = {
    id: string;
    email: string;
    name: string;
    // Optional rather than always-present: the JWT payload never carries it
    // (SessionValidationService re-reads it fresh on every request, same as
    // company settings below), so it only exists on the value returned from
    // validate() — never on the object signed into a token.
    phone?: string | null;
    role: UserRole;
    companyId: string | null;
    // Carried on every request (not baked into the JWT) so a currency/locale
    // change on the Company takes effect on the very next request instead of
    // waiting for the token to expire. null for SUPER_ADMIN, who has no company.
    company: AuthCompanySummary | null;
    // Required for branch-scoped roles (SALES_HEAD, SALES_MANAGER); null for
    // company-wide roles (COMPANY_ADMIN, FINANCE) and SUPER_ADMIN.
    branchId: string | null;
    branch: AuthBranchSummary | null;
    // Present only while this request is running under an impersonated
    // session — set by SessionValidationService after checking the
    // ImpersonationSession row, never trusted from the JWT payload alone.
    impersonation?: AuthImpersonationSummary | null;
};