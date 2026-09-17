export type Permission = {
    id: string;
    key: string;
    module: string;
    action: string;
    description: string;
};

export type Role = {
    id: string;
    name: string;
    description: string | null;
    /** A "Built-in" badge only — a system role is otherwise as editable as any other. */
    isSystem: boolean;
    isBranchScoped: boolean;
    /** Own discretionary discount ceiling, in percent. null means unlimited. */
    discountLimit: number | null;
    /** Read-only: the platform operator's role. Never offered as assignable on the Users page. */
    isPlatformRole: boolean;
    companyId: string | null;
    userCount: number;
    /** Up to 4 users holding this role, for the card grid's avatar preview. */
    sample: {id: string; fullName: string}[];
    permissionKeys: string[];
    createdAt: string;
    updatedAt: string;
};

export type RoleMember = {
    id: string;
    fullName: string;
    email: string;
};
