/**
 * The full catalog of fine-grained permissions the app understands.
 *
 * This is the single source of truth: RbacService.syncCatalog (run once on
 * boot, and by `npx tsx prisma/seed.ts`) upserts every entry here into the
 * `Permission` table, so adding a new permission is just adding a line below
 * — no migration needed, since a Permission row carries no schema beyond
 * this shape. A permission is never removed from here once shipped, only
 * added; removing one would silently break any Role still referencing it.
 *
 * Keys are "<module>.<action>", checked by @RequirePermissions() on a route
 * and matched against a user's effective permissions — the union of every
 * Role assigned to them (see RbacService.getEffectivePermissions). This is
 * the entire access-control layer: there is no fallback to a hardcoded role
 * check anywhere a route is guarded (SUPER_ADMIN aside — see
 * PermissionsGuard, which treats it as an unconditional pass since it
 * belongs to no tenant and no Role can be scoped to it).
 */
export type PermissionDefinition = {
    key: string;
    module: string;
    action: string;
    description: string;
};

function group(module: string, actions: Record<string, string>): PermissionDefinition[] {
    return Object.entries(actions).map(([action, description]) => ({
        key: `${module}.${action}`,
        module,
        action,
        description,
    }));
}

export const PERMISSIONS_CATALOG: PermissionDefinition[] = [
    ...group("leads", {
        view: "View leads",
        create: "Create leads",
        edit: "Edit leads",
        delete: "Delete leads",
        assign: "Reassign a lead to another manager",
        transfer_branch: "Move a lead to a different branch",
    }),
    ...group("clients", {
        view: "View clients",
        create: "Create clients",
        edit: "Edit clients",
        delete: "Delete clients",
        transfer_branch: "Move a client to a different branch",
    }),
    ...group("deals", {
        view: "View deals",
        create: "Reserve a unit / create a deal",
        manage: "Extend, sign, activate or complete a deal",
        cancel: "Cancel a deal",
        reassign: "Reassign a deal to another manager",
        approve_discount: "Approve or reject a discount above the requester's own band",
        manage_payments: "Generate payment schedules and record payments",
    }),
    ...group("projects", {
        view: "View projects",
        create: "Create projects",
        edit: "Edit projects",
        delete: "Delete projects",
    }),
    ...group("inventory", {
        view: "View blocks, entrances, floors and units",
        manage: "Create, edit, delete and bulk-import blocks, entrances, floors and units",
    }),
    ...group("units", {
        edit: "Edit a unit's details and status",
    }),
    ...group("chessboard", {
        view: "View the unit-availability chessboard",
    }),
    ...group("tasks", {
        view: "View tasks",
        create: "Create tasks",
        edit: "Edit tasks and their status",
        delete: "Delete tasks",
    }),
    ...group("documents", {
        view: "View and download generated/uploaded documents",
        upload: "Upload a document",
        delete: "Delete documents",
        generate: "Generate a document from a template for a deal",
        manage_templates: "View and edit document templates",
    }),
    ...group("users", {
        view: "View users",
        create: "Create users",
        edit: "Edit, deactivate or transfer users",
        delete: "Deactivate/remove users",
    }),
    ...group("branches", {
        view: "View branches",
        create: "Create branches",
        edit: "Edit, deactivate or reactivate branches",
    }),
    ...group("activities", {
        view: "View the company activity feed",
    }),
    ...group("dashboard", {
        view: "View the dashboard",
        branch_comparison: "View the cross-branch comparison report",
        team_snapshot: "View a sales head's team snapshot",
        my_performance: "View a sales manager's own performance report",
    }),
    ...group("company_settings", {
        view: "View own company settings",
        edit: "Edit own company settings",
    }),
    ...group("companies", {
        manage: "Manage tenants (platform operator)",
    }),
    ...group("setting_options", {
        manage: "Manage currency/locale/timezone options",
    }),
    ...group("audit_log", {
        view: "View the platform audit log",
    }),
    ...group("rbac", {
        manage: "Manage roles and permissions",
    }),
];

export const PERMISSION_KEYS = PERMISSIONS_CATALOG.map((p) => p.key);
