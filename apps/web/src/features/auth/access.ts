import type {AuthUser} from "@/features/auth/types/auth.types";

/**
 * Which permission unlocks each feature's nav link and route, in one place.
 *
 * The sidebar and the route guards both read from here so a link can never
 * appear for a user the guard will bounce. These mirror the *read* access
 * the API grants (the @RequirePermissions() decorators on each controller's
 * GET endpoints). Write permissions are narrower in several places —
 * creating a project needs projects.create, for instance — and stay
 * enforced server-side. This is about not showing someone a door that will
 * not open.
 */
export const FEATURE_PERMISSIONS = {
    dashboard: "dashboard.view",
    leads: "leads.view",
    tasks: "tasks.view",
    clients: "clients.view",
    deals: "deals.view",
    // Everyone with projects.view can read a project and its chessboard;
    // only projects.create/edit/delete can write, enforced per endpoint.
    projects: "projects.view",
    users: "users.view",
    // Branch management (create/edit/deactivate). branches.view alone (no
    // nav entry) still lets FINANCE read the list to populate their filters.
    branches: "branches.view",
    // The platform operator's tenant-management screen.
    companies: "companies.manage",
    // The currency/locale/timezone options tenants can be assigned — a
    // platform-wide pool the company forms' pickers are built from.
    settingOptions: "setting_options.manage",
    auditLog: "audit_log.view",
    // Company-wide activity feed: branch-scoped roles see only their own
    // branch (enforced by the API — see ActivitiesService.findAll).
    activities: "activities.view",
    // A tenant's own admin editing their own company's name/currency/locale/
    // timezone (CA-A1) — distinct from `companies` above, which is the
    // platform operator's cross-tenant management screen.
    companySettings: "company_settings.view",
    rolesPermissions: "rbac.manage",
} as const satisfies Record<string, string>;

export type Feature = keyof typeof FEATURE_PERMISSIONS;

/**
 * Features that work with no companyId — everything a SUPER_ADMIN's
 * account actually has. Every other feature's API is behind CompanyGuard
 * (or an equivalent service-level `if (!actor.companyId) throw...` check),
 * which rejects a SUPER_ADMIN outright. hasPermission's unconditional "*"
 * bypass would otherwise make canAccess offer a SUPER_ADMIN a nav link and
 * a route for every one of those too — a door that opens onto a 403 or
 * ForbiddenException, not a page. See CompaniesController's guard comment.
 */
const SUPER_ADMIN_FEATURES: readonly Feature[] = ["companies", "settingOptions", "auditLog", "rolesPermissions"];

/**
 * Fine-grained permission check. SUPER_ADMIN carries ["*"] from the API and
 * always passes.
 */
export function hasPermission(user: Pick<AuthUser, "permissions"> | undefined, permission: string): boolean {
    if (!user) return false;
    return user.permissions.includes("*") || user.permissions.includes(permission);
}

export function canAccess(user: Pick<AuthUser, "permissions" | "isSuperAdmin"> | undefined, feature: Feature): boolean {
    if (user?.isSuperAdmin) {
        return SUPER_ADMIN_FEATURES.includes(feature);
    }

    return hasPermission(user, FEATURE_PERMISSIONS[feature]);
}

/**
 * Where a user should land, and where RoleGuard should bounce them back to.
 *
 * This has to depend on isSuperAdmin rather than a fixed "/dashboard": a
 * SUPER_ADMIN has no company, so the dashboard's API calls fail for them.
 * Sending them there on every denial would produce a redirect loop between
 * the guard and a page that cannot load.
 */
export function landingPathFor(user: Pick<AuthUser, "isSuperAdmin"> | undefined): string {
    if (user?.isSuperAdmin) {
        return "/companies";
    }

    return "/dashboard";
}
