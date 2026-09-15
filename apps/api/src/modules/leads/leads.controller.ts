import {Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards} from "@nestjs/common";
import {JwtAuthGuard} from "@/modules/auth/guards/jwt-auth.guard";
import {LeadsService} from "@/modules/leads/leads.service";
import {CurrentUser} from "@/common/decorators/current-user.decorator";
import {AuthUser} from "@/common/types/auth-user.type";
import {QueryLeadsDto} from "@/modules/leads/dto/query-leads.dto";
import {CreateLeadDto} from "@/modules/leads/dto/create-lead.dto";
import {UpdateLeadDto} from "@/modules/leads/dto/update-lead.dto";
import {ConvertLeadDto} from "@/modules/leads/dto/convert-lead.dto";
import {PermissionsGuard} from "@/common/guards/permissions.guard";
import {RequirePermissions} from "@/common/decorators/permissions.decorator";
import {CompanyGuard} from "@/common/guards/company.guard";
import {BranchGuard} from "@/common/guards/branch.guard";
import {TransferBranchDto} from "@/common/dto/transfer-branch.dto";
import {ReassignManagerDto} from "@/common/dto/reassign-manager.dto";
import {LogContactAttemptDto} from "@/modules/leads/dto/log-contact-attempt.dto";

@UseGuards(JwtAuthGuard, CompanyGuard, BranchGuard, PermissionsGuard)
@Controller("leads")
export class LeadsController {
    constructor(private readonly leadsService: LeadsService) {}

    @RequirePermissions("leads.view")
    @Get()
    findAll(@CurrentUser() user: AuthUser, @Query() query: QueryLeadsDto) {
        return this.leadsService.findAll(user, query);
    }

    @RequirePermissions("leads.create")
    @Post()
    create(@CurrentUser() user: AuthUser, @Body() dto: CreateLeadDto) {
        return this.leadsService.create(user, dto);
    }

    @Get("duplicates")
    checkDuplicates(
        @CurrentUser() user: AuthUser,
        @Query("phone") phone: string,
        @Query("excludeLeadId") excludeLeadId?: string,
    ) {
        return this.leadsService.checkDuplicates(user, phone, excludeLeadId);
    }

    @RequirePermissions("leads.view")
    @Get(":id")
    findOne(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.leadsService.findOne(user, id);
    }

    @RequirePermissions("leads.edit")
    @Patch(":id")
    update(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: UpdateLeadDto,
    ) {
        return this.leadsService.update(user, id, dto);
    }

    @RequirePermissions("leads.edit")
    @Post(":id/convert")
    convert(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: ConvertLeadDto,
    ) {
        return this.leadsService.convert(user, id, dto);
    }

    @RequirePermissions("leads.delete")
    @Delete(":id")
    remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.leadsService.remove(user, id);
    }

    // SH-A1: a SALES_HEAD moving a lead between their own team's
    // SALES_MANAGERs. COMPANY_ADMIN included (via the default role bundle)
    // for oversight parity with remove() above; SALES_MANAGER is
    // deliberately excluded — this is a team-lead action, not the general
    // edit any manager already has via PATCH.
    @RequirePermissions("leads.assign")
    @Post(":id/reassign")
    reassignManager(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: ReassignManagerDto,
    ) {
        return this.leadsService.reassignManager(user, id, dto);
    }

    // BR-D1: branch staff can't see across the boundary, so this can only
    // ever be reached by a company-wide role.
    @RequirePermissions("leads.transfer_branch")
    @Post(":id/transfer-branch")
    transferBranch(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: TransferBranchDto,
    ) {
        return this.leadsService.transferBranch(user, id, dto);
    }

    // SM-B1: a one-click log of a call/message/meeting, so a lead's follow-up
    // history is visible even when nothing rises to the level of a task.
    @RequirePermissions("leads.view")
    @Get(":id/activities")
    listActivities(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.leadsService.listActivities(user, id);
    }

    @RequirePermissions("leads.edit")
    @Post(":id/activities")
    logContactAttempt(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: LogContactAttemptDto,
    ) {
        return this.leadsService.logContactAttempt(user, id, dto);
    }
}