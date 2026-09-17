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
    // The dynamic Role this user is assigned (User.roleId — every user has
    // exactly one). Replaces the old fixed `role: UserRole` enum.
    roleId: string;
    roleName: string;
    // The platform-operator flag (User.isSuperAdmin), independent of the
    // Role/permission system entirely — see PermissionsGuard's
    // unconditional bypass. Not derived from roleName: a role literally
    // named "Super Admin" grants no special access on its own.
    //
    // Optional like `permissions` below, for the same reason: a missing
    // value reads as `false` everywhere it's checked (plain truthy checks,
    // never `=== true`), so the many service-layer test fixtures that don't
    // care about super-admin/branch-scoping nuance don't need updating.
    isSuperAdmin?: boolean;
    // From the assigned Role's isBranchScoped flag — replaces the old
    // hardcoded isBranchScopedRole(SALES_HEAD | SALES_MANAGER) check.
    isBranchScoped?: boolean;
    // Effective fine-grained permissions: this user's Role's permission
    // set. Recomputed fresh on every request by SessionValidationService
    // (never baked into the JWT), so granting or revoking a permission
    // takes effect on the very next request instead of waiting for the
    // token to expire. SUPER_ADMIN gets ["*"] — see PermissionsGuard,
    // which treats it as an unconditional pass.
    //
    // Optional rather than always-present so the many service-layer unit
    // tests that build a partial AuthUser fixture (to exercise business
    // logic keyed off role identity, not access control) don't all need
    // updating — PermissionsGuard is the only reader that matters at
    // runtime, and it treats a missing array as no permissions rather than
    // throwing.
    permissions?: string[];
    companyId: string | null;
    // Carried on every request (not baked into the JWT) so a currency/locale
    // change on the Company takes effect on the very next request instead of
    // waiting for the token to expire. null for SUPER_ADMIN, who has no company.
    company: AuthCompanySummary | null;
    // Required when isBranchScoped is true; null for company-wide roles and
    // SUPER_ADMIN.
    branchId: string | null;
    branch: AuthBranchSummary | null;
    // Present only while this request is running under an impersonated
    // session — set by SessionValidationService after checking the
    // ImpersonationSession row, never trusted from the JWT payload alone.
    impersonation?: AuthImpersonationSummary | null;
};
