import { UserRole } from "@/generated/prisma/client";

/**
 * The permission set each legacy `UserRole` gets when its matching system
 * Role is seeded (see RbacService.syncSystemRoles / prisma/seed.ts). This is
 * a direct transcription of what every @Roles()-guarded endpoint in the
 * codebase granted that role before this module replaced RolesGuard — it
 * preserves today's access exactly, as a starting point a COMPANY_ADMIN can
 * then fork into narrower custom roles.
 *
 * SUPER_ADMIN is intentionally absent: it bypasses permission checks
 * entirely (see PermissionsGuard) rather than needing every key listed.
 */
export const DEFAULT_ROLE_PERMISSIONS: Partial<Record<UserRole, string[]>> = {
    [UserRole.COMPANY_ADMIN]: [
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
    [UserRole.SALES_HEAD]: [
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
    [UserRole.SALES_MANAGER]: [
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
    [UserRole.FINANCE]: [
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
