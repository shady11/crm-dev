import {Body, Controller, Get, Param, Post, UseGuards} from "@nestjs/common";
import {JwtAuthGuard} from "@/modules/auth/guards/jwt-auth.guard";
import {CompanyGuard} from "@/common/guards/company.guard";
import {PermissionsGuard} from "@/common/guards/permissions.guard";
import {BranchGuard} from "@/common/guards/branch.guard";
import {RequirePermissions} from "@/common/decorators/permissions.decorator";
import {CurrentUser} from "@/common/decorators/current-user.decorator";
import {AuthUser} from "@/common/types/auth-user.type";
import {LeadsService} from "@/modules/leads/leads.service";
import {HandoverService} from "./handover.service";
import {HandOverDto} from "./dto/hand-over.dto";
import {BulkReassignLeadsDto} from "./dto/bulk-reassign-leads.dto";

// SH-5: moving a team member's work in bulk. Team-lead actions, like the
// one-off reassignments they're built from (SH-A1).
@Controller()
@UseGuards(JwtAuthGuard, CompanyGuard, BranchGuard, PermissionsGuard)
export class TeamController {
    constructor(
        private readonly handover: HandoverService,
        private readonly leads: LeadsService,
    ) {}

    @RequirePermissions("leads.assign")
    @Post("leads/bulk-reassign")
    bulkReassignLeads(@CurrentUser() user: AuthUser, @Body() dto: BulkReassignLeadsDto) {
        return this.leads.bulkReassign(user, dto.leadIds, dto.managerId);
    }

    // Needs leads.assign too; checked in the service, since the guard's
    // list is "any of".
    @RequirePermissions("deals.reassign")
    @Get("users/:id/handover")
    previewHandover(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.handover.preview(user, id);
    }

    @RequirePermissions("deals.reassign")
    @Post("users/:id/handover")
    handOver(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: HandOverDto) {
        return this.handover.handOver(user, id, dto.managerId);
    }
}
