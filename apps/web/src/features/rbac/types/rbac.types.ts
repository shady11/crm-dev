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
    isSystem: boolean;
    companyId: string | null;
    userCount: number;
    /** Up to 4 users holding this role, for the card grid's avatar preview. */
    sample: {id: string; fullName: string}[];
    permissionKeys: string[];
    createdAt: string;
    updatedAt: string;
};

export type UserRolesResponse = {
    roles: {id: string; name: string; isSystem: boolean; companyId: string | null}[];
    permissions: string[];
};
