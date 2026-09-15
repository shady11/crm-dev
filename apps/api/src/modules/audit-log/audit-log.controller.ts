import {Controller, Get, Query, UseGuards} from "@nestjs/common";
import {JwtAuthGuard} from "@/modules/auth/guards/jwt-auth.guard";
import {PermissionsGuard} from "@/common/guards/permissions.guard";
import {RequirePermissions} from "@/common/decorators/permissions.decorator";
import {AuditLogService} from "./audit-log.service";
import {QueryAuditLogsDto} from "./dto/query-audit-logs.dto";

// Platform-wide, so SUPER_ADMIN only (audit_log.view is granted to no Role —
// reachable only through PermissionsGuard's unconditional SUPER_ADMIN
// bypass) — same reasoning and guard shape as CompaniesController: no
// CompanyGuard, since the actor has no companyId.
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions("audit_log.view")
@Controller("audit-logs")
export class AuditLogController {
    constructor(private readonly auditLogService: AuditLogService) {}

    @Get()
    findAll(@Query() query: QueryAuditLogsDto) {
        return this.auditLogService.findAll(query);
    }
}
