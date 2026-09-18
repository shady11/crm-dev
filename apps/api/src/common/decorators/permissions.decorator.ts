import { SetMetadata } from "@nestjs/common";

export const PERMISSIONS_KEY = "permissions";

/**
 * Requires the caller to hold at least one of the listed permission keys
 * (an "any of" match). This is the entire access-control layer — see
 * PermissionsGuard, which reads this metadata; there is no separate
 * role-based guard.
 */
export const RequirePermissions = (...permissions: string[]) =>
    SetMetadata(PERMISSIONS_KEY, permissions);
