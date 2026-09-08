import {UserRole} from "@/generated/prisma/client";

// SALES_HEAD and SALES_MANAGER work at one location and are isolated to it.
// COMPANY_ADMIN and FINANCE keep company-wide visibility (and SUPER_ADMIN has
// no company at all, so the question doesn't apply to them).
const BRANCH_SCOPED_ROLES: UserRole[] = [UserRole.SALES_HEAD, UserRole.SALES_MANAGER];

export function isBranchScopedRole(role: UserRole): boolean {
    return BRANCH_SCOPED_ROLES.includes(role);
}
