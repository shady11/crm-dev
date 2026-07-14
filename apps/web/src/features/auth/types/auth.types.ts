export type UserRole =
    | "SUPER_ADMIN"
    | "COMPANY_ADMIN"
    | "SALES_HEAD"
    | "SALES_MANAGER"
    | "FINANCE";

export type AuthUser = {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    companyId: string | null;
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
        company: {
            id: string;
            name: string;
        } | null;
    };
};