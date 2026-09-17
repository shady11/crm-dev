import {Module} from "@nestjs/common";
import {AuditLogModule} from "@/modules/audit-log/audit-log.module";
import {ImpersonationModule} from "@/modules/impersonation/impersonation.module";
import {SettingOptionsModule} from "@/modules/setting-options/setting-options.module";
import {RbacModule} from "@/modules/rbac/rbac.module";
import {CompaniesController} from "./companies.controller";
import {CompaniesService} from "./companies.service";

@Module({
    imports: [AuditLogModule, ImpersonationModule, SettingOptionsModule, RbacModule],
    controllers: [CompaniesController],
    providers: [CompaniesService],
})
export class CompaniesModule {}
