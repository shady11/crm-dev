import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from "@nestjs/common";
import {AuthUser} from "@/common/types/auth-user.type";
import {isBranchScopedRole} from "@/common/constants/branch-scope.constants";

// Mirrors CompanyGuard exactly: a pure existence check, applied after it in
// the guard stack. It does not filter any data itself — row-level branch
// filtering is manual, per-service-method, the same as company filtering.
@Injectable()
export class BranchGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const user = request.user as AuthUser | undefined;

        if (!user) {
            throw new ForbiddenException("User not found in request");
        }

        // Company-wide roles have no branch requirement — this guard is a
        // no-op for them, same as CompanyGuard is effectively a no-op for
        // any route SUPER_ADMIN can't reach in the first place.
        if (!isBranchScopedRole(user.role)) {
            return true;
        }

        if (!user.branchId) {
            throw new ForbiddenException("User is not assigned to a branch");
        }

        return true;
    }
}
