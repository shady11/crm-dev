import {UserRole} from "@/generated/prisma/enums";

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
    // Carried on every request (not baked into the JWT) so a currency/locale
    // change on the Company takes effect on the very next request instead of
    // waiting for the token to expire. null for SUPER_ADMIN, who has no company.
    company: AuthCompanySummary | null;
};