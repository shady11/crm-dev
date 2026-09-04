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

export type AuthUser = {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    companyId: string | null;
    // Re-fetched by the API on every request (never baked into the JWT), so
    // this always reflects the company's current settings.
    company: AuthCompanySummary | null;
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
    };
};