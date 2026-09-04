import type {UserRole} from "@/features/users/types/user.types";

export type Company = {
    id: string;
    name: string;
    phone: string | null;
    address: string | null;
    currency: string | null;
    locale: string | null;
    timezone: string | null;
    /** Non-null means suspended. Reversible, unlike deletion. */
    suspendedAt: string | null;
    createdAt: string;
    updatedAt: string;
    _count?: {
        users: number;
        projects: number;
    };
};

export type CompanyUser = {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    role: UserRole;
    isActive: boolean;
    createdAt: string;
};

export type CompanyStats = {
    users: number;
    activeUsers: number;
    projects: number;
    units: number;
    clients: number;
    leads: number;
    deals: number;
    activeDeals: number;
};

export type CompanyDetails = Company & {
    users: CompanyUser[];
    stats: CompanyStats;
};

export function isSuspended(company: Pick<Company, "suspendedAt">): boolean {
    return company.suspendedAt !== null;
}
