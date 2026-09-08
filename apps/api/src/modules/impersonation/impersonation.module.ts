import {Module} from "@nestjs/common";
import {AuthModule} from "@/modules/auth/auth.module";
import {ImpersonationController} from "./impersonation.controller";
import {ImpersonationService} from "./impersonation.service";

@Module({
    // AuthModule is imported (not re-declared) so ImpersonationService signs
    // tokens with the exact same configured JwtService as login/change-password.
    imports: [AuthModule],
    controllers: [ImpersonationController],
    providers: [ImpersonationService],
    exports: [ImpersonationService],
})
export class ImpersonationModule {}
