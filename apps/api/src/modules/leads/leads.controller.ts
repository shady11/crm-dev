import {Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards} from "@nestjs/common";
import {JwtAuthGuard} from "@/modules/auth/guards/jwt-auth.guard";
import {LeadsService} from "@/modules/leads/leads.service";
import {CurrentUser} from "@/common/decorators/current-user.decorator";
import {AuthUser} from "@/common/types/auth-user.type";
import {QueryLeadsDto} from "@/modules/leads/dto/query-leads.dto";
import {CreateLeadDto} from "@/modules/leads/dto/create-lead.dto";
import {UpdateLeadDto} from "@/modules/leads/dto/update-lead.dto";
import {ConvertLeadDto} from "@/modules/leads/dto/convert-lead.dto";
import {RolesGuard} from "@/common/guards/roles.guard";
import {Roles} from "@/common/decorators/roles.decorator";
import {UserRole} from "@/generated/prisma/enums";
import {CompanyGuard} from "@/common/guards/company.guard";

@UseGuards(JwtAuthGuard, CompanyGuard, RolesGuard)
@Controller("leads")
export class LeadsController {
    constructor(private readonly leadsService: LeadsService) {}

    @Roles(
        UserRole.COMPANY_ADMIN,
        UserRole.SALES_HEAD,
        UserRole.SALES_MANAGER,
    )
    @Get()
    findAll(@CurrentUser() user: AuthUser, @Query() query: QueryLeadsDto) {
        return this.leadsService.findAll(user, query);
    }

    @Roles(
        UserRole.COMPANY_ADMIN,
        UserRole.SALES_HEAD,
        UserRole.SALES_MANAGER,
    )
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

    @Roles(
        UserRole.COMPANY_ADMIN,
        UserRole.SALES_HEAD,
        UserRole.SALES_MANAGER,
    )
    @Get(":id")
    findOne(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.leadsService.findOne(user, id);
    }

    @Roles(
        UserRole.COMPANY_ADMIN,
        UserRole.SALES_HEAD,
        UserRole.SALES_MANAGER,
    )
    @Patch(":id")
    update(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: UpdateLeadDto,
    ) {
        return this.leadsService.update(user, id, dto);
    }

    @Roles(
        UserRole.COMPANY_ADMIN,
        UserRole.SALES_HEAD,
        UserRole.SALES_MANAGER,
    )
    @Post(":id/convert")
    convert(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: ConvertLeadDto,
    ) {
        return this.leadsService.convert(user, id, dto);
    }

    @Roles(UserRole.COMPANY_ADMIN, UserRole.SALES_HEAD)
    @Delete(":id")
    remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.leadsService.remove(user, id);
    }
}