export type UserRole =
    | "SUPER_ADMIN"
    | "COMPANY_ADMIN"
    | "SALES_HEAD"
    | "SALES_MANAGER"
    | "FINANCE";

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
    role: UserRole;
    companyId: string | null;
    // Re-fetched by the API on every request (never baked into the JWT), so
    // this always reflects the company's current settings.
    company: AuthCompanySummary | null;
    // Required for branch-scoped roles (SALES_HEAD, SALES_MANAGER); null for
    // company-wide roles (COMPANY_ADMIN, FINANCE) and SUPER_ADMIN.
    branchId: string | null;
    branch: AuthBranchSummary | null;
    // Present only while the active session is an impersonated one.
    impersonation?: AuthImpersonationSummary | null;
};

export type LoginResponse = {
    accessToken: string;
    user: {
        id: string;
        fullName: string;
        email: string;
        phone: string | null;
        role: UserRole;
        companyId: string | null;
        company: AuthCompanySummary | null;
        branchId: string | null;
        branch: AuthBranchSummary | null;
    };
};

export type ImpersonateResponse = {
    accessToken: string;
    expiresAt: string;
    user: LoginResponse["user"];
};

export type EndImpersonationResponse = {
    accessToken: string;
};