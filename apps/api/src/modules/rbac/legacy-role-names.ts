/**
 * The five system Role names seeded from the old UserRole enum (see
 * default-role-permissions.ts and RbacService.syncSystemRoles). A handful
 * of places still need to identify "the Sales Head role" etc. by name for
 * business logic that predates dynamic roles and is tied to these specific
 * tiers — discount-approval bands and a couple of "who to notify" lookups.
 * Not meant to grow: a tenant's own custom roles never participate in this,
 * only the seeded system ones.
 */
export const LEGACY_ROLE_NAMES = {
    SUPER_ADMIN: "Super Admin",
    COMPANY_ADMIN: "Company Admin",
    SALES_HEAD: "Sales Head",
    SALES_MANAGER: "Sales Manager",
    FINANCE: "Finance",
} as const;
