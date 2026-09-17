/**
 * Mirrors the API's LEGACY_ROLE_NAMES (apps/api/src/modules/rbac/legacy-role-names.ts)
 * — the handful of UI decisions still tied to a specific legacy role by name
 * rather than a permission (e.g. SH-A1's "Sales Head only" reassignment
 * action), not a redesign of that business rule.
 */
export const LEGACY_ROLE_NAMES = {
    SUPER_ADMIN: "Super Admin",
    COMPANY_ADMIN: "Company Admin",
    SALES_HEAD: "Sales Head",
    SALES_MANAGER: "Sales Manager",
    FINANCE: "Finance",
} as const;
