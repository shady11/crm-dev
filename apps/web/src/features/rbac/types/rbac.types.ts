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
    permissionKeys: string[];
    createdAt: string;
    updatedAt: string;
};

export type UserRolesResponse = {
    roles: {id: string; name: string; isSystem: boolean; companyId: string | null}[];
    permissions: string[];
};
