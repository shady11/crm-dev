import {UserRole} from "@/features/users/types/user.types";

/**
 * Which roles may reach each feature, in one place.
 *
 * The sidebar and the route guards both read from here so a link can never
 * appear for a role the guard will bounce — previously RoleGuard covered only
 * deals and tasks while the sidebar offered every link to everyone, so a sales
 * manager saw "Users", clicked it, and got a wall of 403s.
 *
 * These mirror the *read* access the API grants (the @Roles decorators on each
 * controller's GET endpoints). Write permissions are narrower in several places
 * — creating a project is COMPANY_ADMIN only, for instance — and stay enforced
 * server-side. This is about not showing someone a door that will not open.
 */
export const FEATURE_ROLES = {
    dashboard: [
        UserRole.COMPANY_ADMIN,
        UserRole.SALES_HEAD,
        UserRole.SALES_MANAGER,
        UserRole.FINANCE,
    ],
    // No FINANCE: the leads controller omits it on every endpoint.
    leads: [UserRole.COMPANY_ADMIN, UserRole.SALES_HEAD, UserRole.SALES_MANAGER],
    tasks: [
        UserRole.COMPANY_ADMIN,
        UserRole.SALES_HEAD,
        UserRole.SALES_MANAGER,
        UserRole.FINANCE,
    ],
    clients: [
        UserRole.COMPANY_ADMIN,
        UserRole.SALES_HEAD,
        UserRole.SALES_MANAGER,
        UserRole.FINANCE,
    ],
    deals: [
        UserRole.COMPANY_ADMIN,
        UserRole.SALES_HEAD,
        UserRole.SALES_MANAGER,
        UserRole.FINANCE,
    ],
    // Everyone can read a project and its chessboard; only COMPANY_ADMIN can
    // create, edit or delete one, which the API enforces per endpoint.
    projects: [
        UserRole.COMPANY_ADMIN,
        UserRole.SALES_HEAD,
        UserRole.SALES_MANAGER,
        UserRole.FINANCE,
    ],
    users: [UserRole.COMPANY_ADMIN, UserRole.SALES_HEAD],
    // Branch management (create/edit/deactivate) — COMPANY_ADMIN only, same
    // as who may write to /branches. FINANCE can still read the list (used
    // to populate their own filters) without this nav entry.
    branches: [UserRole.COMPANY_ADMIN],
    // The platform operator, and only them. A SUPER_ADMIN belongs to no company
    // and is refused by CompanyGuard everywhere else in the app, so this is the
    // one feature they can reach.
    companies: [UserRole.SUPER_ADMIN],
    auditLog: [UserRole.SUPER_ADMIN],
    // A tenant's own admin editing their own company's name/currency/locale/
    // timezone (CA-A1) — distinct from `companies` above, which is the
    // SUPER_ADMIN's cross-tenant management screen.
    companySettings: [UserRole.COMPANY_ADMIN],
} as const satisfies Record<string, readonly UserRole[]>;

export type Feature = keyof typeof FEATURE_ROLES;

export function canAccess(role: UserRole | undefined, feature: Feature): boolean {
    return role !== undefined && (FEATURE_ROLES[feature] as readonly UserRole[]).includes(role);
}

/**
 * Where a role should land, and where RoleGuard should bounce it back to.
 *
 * This has to be per-role rather than a fixed "/dashboard": a SUPER_ADMIN has
 * no company, so the dashboard's API calls fail for them. Sending them there on
 * every denial would produce a redirect loop between the guard and a page that
 * cannot load.
 */
export function landingPathFor(role: UserRole | undefined): string {
    if (role === UserRole.SUPER_ADMIN) {
        return "/companies";
    }

    return "/dashboard";
}
