import { AuthUser } from "@/common/types/auth-user.type";

/**
 * Service-layer permission check for business logic that needs to reason
 * about a specific permission (not just gate a whole endpoint, which
 * PermissionsGuard already does) — e.g. "is this decider actually allowed
 * to approve a discount". SUPER_ADMIN always passes, same as the guard.
 */
export function hasPermission(user: Pick<AuthUser, "isSuperAdmin" | "permissions">, key: string): boolean {
    if (user.isSuperAdmin) return true;
    return (user.permissions ?? []).includes(key);
}
