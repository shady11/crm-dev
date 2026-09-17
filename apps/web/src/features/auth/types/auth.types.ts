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
    // Re-fetched fresh by the API on every request, same as `company` below.
    phone?: string | null;
    // The dynamic Role this user is assigned — replaces the old fixed
    // `role: UserRole` enum. See GET /rbac/roles for the full catalog.
    roleId: string;
    roleName: string;
    // The platform-operator flag, independent of the Role/permission system.
    isSuperAdmin: boolean;
    // From the assigned Role — replaces the old hardcoded
    // SALES_HEAD/SALES_MANAGER branch-scoping check.
    isBranchScoped: boolean;
    // Effective fine-grained permissions (this user's Role's permission
    // set), recomputed by the API on every /auth/me fetch. Drives
    // fine-grained UI gating (see hasPermission in access.ts); SUPER_ADMIN
    // gets ["*"].
    permissions: string[];
    companyId: string | null;
    // Re-fetched by the API on every request (never baked into the JWT), so
    // this always reflects the company's current settings.
    company: AuthCompanySummary | null;
    // Required when isBranchScoped is true; null for company-wide roles and
    // SUPER_ADMIN.
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
        roleId: string;
        roleName: string;
        isSuperAdmin: boolean;
        isBranchScoped: boolean;
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
