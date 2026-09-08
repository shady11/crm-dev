import {Controller, Get, Query, UseGuards} from "@nestjs/common";
import {UserRole} from "@/generated/prisma/enums";
import {JwtAuthGuard} from "@/modules/auth/guards/jwt-auth.guard";
import {RolesGuard} from "@/common/guards/roles.guard";
import {Roles} from "@/common/decorators/roles.decorator";
import {AuditLogService} from "./audit-log.service";
import {QueryAuditLogsDto} from "./dto/query-audit-logs.dto";

// Platform-wide, so SUPER_ADMIN only — same reasoning and guard shape as
// CompaniesController: no CompanyGuard, since the actor has no companyId.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller("audit-logs")
export class AuditLogController {
    constructor(private readonly auditLogService: AuditLogService) {}

    @Get()
    findAll(@Query() query: QueryAuditLogsDto) {
        return this.auditLogService.findAll(query);
    }
}
