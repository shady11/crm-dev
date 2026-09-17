/**
 * The five roles this app seeds once, on first boot (see
 * RbacService.seedDefaultRolesIfMissing), so a fresh database has a working
 * set of roles to assign users to. This is one-time seed data, not a
 * runtime source of truth — once created, these rows are ordinary Role
 * rows: a platform administrator can rename them, change their
 * permissions, or delete them exactly like any other global role. Nothing
 * elsewhere in the app compares against these names at runtime; the
 * handful of places that used to (discount approval, reassignment
 * targets, "notify the team lead") now key off Role.discountLimit and
 * permission membership instead — see DealDomainService, DealsService,
 * LeadsService, DashboardService and PaymentReminderCronService.
 */
export type DefaultRoleSeed = {
    name: string;
    description: string;
    permissionKeys: string[];
    isBranchScoped?: boolean;
    /** Own discretionary discount ceiling, in percent. Omitted = unlimited. */
    discountLimit?: number;
    /** The role a brand-new tenant's first administrator is assigned. */
    isDefaultCompanyAdmin?: boolean;
    /** The platform operator's role — never assignable to a normal user. */
    isPlatformRole?: boolean;
};

export const DEFAULT_ROLES: DefaultRoleSeed[] = [
    {
        name: "Super Admin",
        description: "The platform operator. Bypasses the permission system entirely via User.isSuperAdmin.",
        permissionKeys: [],
        isPlatformRole: true,
    },
    {
        name: "Company Admin",
        description: "Full access to one tenant: users, branches, inventory, deals, and settings.",
        isDefaultCompanyAdmin: true,
        permissionKeys: [
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
    },
    {
        name: "Sales Head",
        description: "Runs one branch's sales team: leads, deals, and discount approval up to their own band.",
        isBranchScoped: true,
        discountLimit: 15,
        permissionKeys: [
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
    },
    {
        name: "Sales Manager",
        description: "An individual contributor on a branch's sales team: their own leads, clients, and deals.",
        isBranchScoped: true,
        discountLimit: 5,
        permissionKeys: [
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
    },
    {
        name: "Finance",
        description: "Read access to deals and payments across the company, for reconciliation and reporting.",
        permissionKeys: [
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
    },
];
