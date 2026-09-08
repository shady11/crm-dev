import {Module} from "@nestjs/common";
import {AuditLogModule} from "@/modules/audit-log/audit-log.module";
import {ImpersonationModule} from "@/modules/impersonation/impersonation.module";
import {CompaniesController} from "./companies.controller";
import {CompaniesService} from "./companies.service";

@Module({
    imports: [AuditLogModule, ImpersonationModule],
    controllers: [CompaniesController],
    providers: [CompaniesService],
})
export class CompaniesModule {}
