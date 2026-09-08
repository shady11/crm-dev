import {Controller, HttpCode, HttpStatus, Post, UseGuards} from "@nestjs/common";
import {JwtAuthGuard} from "@/modules/auth/guards/jwt-auth.guard";
import {CurrentUser} from "@/common/decorators/current-user.decorator";
import {AuthUser} from "@/common/types/auth-user.type";
import {ImpersonationService} from "./impersonation.service";

// Registered under the same "auth" path prefix as AuthController, in a
// separate module: ImpersonationService needs the configured JwtService,
// which only AuthModule exports, and AuthModule cannot import this module
// back without a circular dependency. Two controllers may share a path
// prefix across modules as long as their routes don't collide.
@UseGuards(JwtAuthGuard)
@Controller("auth")
export class ImpersonationController {
    constructor(private readonly impersonationService: ImpersonationService) {}

    @Post("end-impersonation")
    @HttpCode(HttpStatus.OK)
    end(@CurrentUser() user: AuthUser) {
        return this.impersonationService.end(user);
    }
}
