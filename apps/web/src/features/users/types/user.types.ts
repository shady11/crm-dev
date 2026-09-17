export type UserRoleSummary = {
    id: string;
    name: string;
    isBranchScoped: boolean;
};

export type User = {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    roleId: string;
    role: UserRoleSummary;
    isActive: boolean;
    companyId: string | null;
    branchId: string | null;
    branch: {id: string; name: string} | null;
    createdAt: string;
    updatedAt: string;
};
