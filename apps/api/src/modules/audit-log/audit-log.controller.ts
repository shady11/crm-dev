import {Controller, Get, Query, UseGuards} from "@nestjs/common";
import {JwtAuthGuard} from "@/modules/auth/guards/jwt-auth.guard";
import {PermissionsGuard} from "@/common/guards/permissions.guard";
import {RequirePermissions} from "@/common/decorators/permissions.decorator";
import {CurrentUser} from "@/common/decorators/current-user.decorator";
import {AuthUser} from "@/common/types/auth-user.type";
import {AuditLogService} from "./audit-log.service";
import {QueryAuditLogsDto} from "./dto/query-audit-logs.dto";
import {QueryOwnLoginsDto} from "./dto/query-own-logins.dto";

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

    // A different, narrower permission from the class-level audit_log.view —
    // granted to COMPANY_ADMIN by default, so a tenant's own admin can see
    // their own users' login activity without being able to reach findAll()
    // above (every other tenant's data, and every other action type).
    @RequirePermissions("audit_log.view_own")
    @Get("logins")
    findOwnLogins(@CurrentUser() actor: AuthUser, @Query() query: QueryOwnLoginsDto) {
        return this.auditLogService.findOwnLogins(actor, query);
    }
}
