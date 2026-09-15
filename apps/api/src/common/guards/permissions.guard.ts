import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "@/generated/prisma/client";
import { PERMISSIONS_KEY } from "@/common/decorators/permissions.decorator";
import { AuthUser } from "@/common/types/auth-user.type";

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!required || required.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user as AuthUser | undefined;

        if (!user) {
            throw new ForbiddenException("User not found in request");
        }

        // The platform operator is exempt: it belongs to no company and no
        // Role can be scoped to it, so it always passes rather than needing
        // a role that lists every permission (which would silently go stale
        // as new permissions are added).
        if (user.role === UserRole.SUPER_ADMIN) {
            return true;
        }

        const granted = new Set(user.permissions ?? []);
        const allowed = required.some((permission) => granted.has(permission));

        if (!allowed) {
            throw new ForbiddenException("You do not have permission for this action");
        }

        return true;
    }
}
