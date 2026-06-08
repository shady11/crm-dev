import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "@/generated/prisma/client";
import { ROLES_KEY } from "@/common/decorators/roles.decorator";
import { AuthUser } from "@/common/types/auth-user.type";

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
            ROLES_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user as AuthUser | undefined;

        if (!user) {
            throw new ForbiddenException("User not found in request");
        }

        if (!requiredRoles.includes(user.role)) {
            throw new ForbiddenException("You do not have permission for this action");
        }

        return true;
    }
}