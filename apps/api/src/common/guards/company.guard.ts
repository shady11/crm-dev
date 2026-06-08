import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from "@nestjs/common";
import {AuthUser} from "@/common/types/auth-user.type";

@Injectable()
export class CompanyGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const user = request.user as AuthUser | undefined;

        if (!user) {
            throw new ForbiddenException("User not found in request");
        }

        if (!user.companyId) {
            throw new ForbiddenException("User does not belong to a company");
        }

        return true;
    }
}