import {UserRole} from "@/generated/prisma/client";

/**
 * Roles visible to/manageable by a given actor role.
 * SUPER_ADMIN can see and manage everyone.
 * Everyone else can never see or act on a SUPER_ADMIN.
 */
export function getManageableRoles(actorRole: UserRole): UserRole[] {
    if (actorRole === UserRole.SUPER_ADMIN) {
        return Object.values(UserRole);
    }

    return Object.values(UserRole).filter((role) => role !== UserRole.SUPER_ADMIN);
}

export function canActorSeeRole(actorRole: UserRole, targetRole: UserRole): boolean {
    return getManageableRoles(actorRole).includes(targetRole);
}