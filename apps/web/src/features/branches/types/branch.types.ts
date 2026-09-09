import type {UserRole} from "@/features/users/types/user.types";

export type Branch = {
    id: string;
    companyId: string;
    name: string;
    city: string | null;
    address: string | null;
    phone: string | null;
    /** Non-null means deactivated. Reversible, unlike deletion — there is no delete path. */
    deactivatedAt: string | null;
    createdAt: string;
    updatedAt: string;
};

export function isDeactivated(branch: Pick<Branch, "deactivatedAt">): boolean {
    return branch.deactivatedAt !== null;
}

export const BRANCH_STATUS_BADGE_CLASSES: Record<number, string> = {
    0: "bg-emerald-400 text-white",
    1: "bg-rose-400 text-white",
};

export type BranchUser = {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    role: UserRole;
    isActive: boolean;
    createdAt: string;
};

export type BranchStats = {
    users: number;
    activeUsers: number;
};

export type BranchDetails = Branch & {
    users: BranchUser[];
    stats: BranchStats;
};
