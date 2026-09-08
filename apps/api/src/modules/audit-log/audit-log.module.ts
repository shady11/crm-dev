import {Global, Module} from "@nestjs/common";
import {AuditLogController} from "./audit-log.controller";
import {AuditLogService} from "./audit-log.service";

// Global: written to from several otherwise-unrelated modules (companies,
// impersonation, and a global interceptor), same reasoning as PrismaModule.
@Global()
@Module({
    controllers: [AuditLogController],
    providers: [AuditLogService],
    exports: [AuditLogService],
})
export class AuditLogModule {}
