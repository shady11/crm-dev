export const UserRole = {
    SUPER_ADMIN: "SUPER_ADMIN",
    COMPANY_ADMIN: "COMPANY_ADMIN",
    SALES_MANAGER: "SALES_MANAGER",
    SALES_HEAD: "SALES_HEAD",
    FINANCE: "FINANCE",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const USER_ROLE_VALUES = [
    UserRole.SUPER_ADMIN,
    UserRole.COMPANY_ADMIN,
    UserRole.SALES_MANAGER,
    UserRole.SALES_HEAD,
    UserRole.FINANCE,
] as const;

export const USER_ROLE_LABELS: Record<UserRole, string> = {
    [UserRole.SUPER_ADMIN]: "Super Admin",
    [UserRole.COMPANY_ADMIN]: "Company Admin",
    [UserRole.SALES_MANAGER]: "Sales Manager",
    [UserRole.SALES_HEAD]: "Sales Head",
    [UserRole.FINANCE]: "Finance",
};

export const USER_ROLE_BADGE_CLASSES: Record<UserRole, string> = {
    [UserRole.SUPER_ADMIN]: "bg-cyan-500",
    [UserRole.COMPANY_ADMIN]: "bg-blue-500",
    [UserRole.SALES_MANAGER]: "bg-emerald-500",
    [UserRole.SALES_HEAD]: "bg-amber-500",
    [UserRole.FINANCE]: "bg-indigo-500",
};

export function isUserRole(role?: string | null): role is UserRole {
    const normalized = role?.trim().toUpperCase();
    return USER_ROLE_VALUES.some((value) => value === normalized);
}

export function normalizeUserRole(role?: string | null): UserRole {
    const normalized = role?.trim().toUpperCase();
    return isUserRole(normalized) ? normalized : UserRole.SALES_MANAGER;
}

export type User = {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    role: UserRole;
    isActive: boolean;
    companyId: string | null;
    createdAt: string;
    updatedAt: string;
};

export function getVisibleRoles(actorRole?: UserRole | null): UserRole[] {
    if (actorRole === UserRole.SUPER_ADMIN) {
        return [...USER_ROLE_VALUES];
    }

    return USER_ROLE_VALUES.filter((role) => role !== UserRole.SUPER_ADMIN);
}