import { LEGACY_ROLE_NAMES } from "./legacy-role-names";

/**
 * The permission set each system Role is seeded with (see
 * RbacService.syncSystemRoles / prisma/seed.ts), keyed by name rather than
 * an enum — this is what every @Roles()-guarded endpoint in the codebase
 * granted that role before this module replaced RolesGuard, transcribed
 * directly so access didn't change the day this module shipped. A
 * COMPANY_ADMIN can fork any of these into a narrower custom role.
 *
 * "Super Admin" is seeded with no permissions at all: it bypasses
 * permission checks entirely (see PermissionsGuard and User.isSuperAdmin)
 * rather than needing every key listed — the Role row exists only so every
 * user, platform operators included, has a Role to point at.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
    [LEGACY_ROLE_NAMES.SUPER_ADMIN]: [],
    [LEGACY_ROLE_NAMES.COMPANY_ADMIN]: [
        "leads.view", "leads.create", "leads.edit", "leads.delete", "leads.assign", "leads.transfer_branch",
        "clients.view", "clients.create", "clients.edit", "clients.delete", "clients.transfer_branch",
        "deals.view", "deals.create", "deals.manage", "deals.cancel", "deals.reassign", "deals.approve_discount", "deals.manage_payments",
        "projects.view", "projects.create", "projects.edit", "projects.delete",
        "inventory.view", "inventory.manage",
        "units.edit",
        "chessboard.view",
        "tasks.view", "tasks.create", "tasks.edit", "tasks.delete",
        "documents.view", "documents.upload", "documents.delete", "documents.generate", "documents.manage_templates",
        "users.view", "users.create", "users.edit", "users.delete",
        "branches.view", "branches.create", "branches.edit",
        "activities.view",
        "dashboard.view", "dashboard.branch_comparison",
        "company_settings.view", "company_settings.edit",
        "rbac.manage",
    ],
    [LEGACY_ROLE_NAMES.SALES_HEAD]: [
        "leads.view", "leads.create", "leads.edit", "leads.delete", "leads.assign",
        "clients.view", "clients.create", "clients.edit", "clients.delete",
        "deals.view", "deals.create", "deals.manage", "deals.cancel", "deals.reassign", "deals.approve_discount", "deals.manage_payments",
        "projects.view",
        "inventory.view",
        "units.edit",
        "chessboard.view",
        "tasks.view", "tasks.create", "tasks.edit", "tasks.delete",
        "documents.view", "documents.upload", "documents.delete", "documents.generate",
        "users.view",
        "activities.view",
        "dashboard.view", "dashboard.team_snapshot",
    ],
    [LEGACY_ROLE_NAMES.SALES_MANAGER]: [
        "leads.view", "leads.create", "leads.edit",
        "clients.view", "clients.create", "clients.edit",
        "deals.view", "deals.create", "deals.manage", "deals.manage_payments",
        "projects.view",
        "inventory.view",
        "chessboard.view",
        "tasks.view", "tasks.create", "tasks.edit",
        "documents.view", "documents.upload", "documents.generate",
        "activities.view",
        "dashboard.view", "dashboard.my_performance",
    ],
    [LEGACY_ROLE_NAMES.FINANCE]: [
        "clients.view",
        "deals.view", "deals.manage_payments",
        "projects.view",
        "inventory.view",
        "chessboard.view",
        "tasks.view", "tasks.create", "tasks.edit",
        "documents.view", "documents.upload",
        "branches.view",
        "dashboard.view",
    ],
};

/** Which of the seeded system roles are branch-scoped — see Role.isBranchScoped. */
export const BRANCH_SCOPED_SYSTEM_ROLES: string[] = [
    LEGACY_ROLE_NAMES.SALES_HEAD,
    LEGACY_ROLE_NAMES.SALES_MANAGER,
];
