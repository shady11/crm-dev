/**
 * A user can never see or act on a SUPER_ADMIN account unless they are one
 * themselves — the only visibility rule that survives the move away from a
 * fixed role enum, since every other role is just a dynamic Role a
 * COMPANY_ADMIN can freely see and assign within their own company.
 */
export function canActorSeeUser(actor: {isSuperAdmin?: boolean}, target: {isSuperAdmin: boolean}): boolean {
    return Boolean(actor.isSuperAdmin) || !target.isSuperAdmin;
}
