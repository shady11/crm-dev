import {Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards} from "@nestjs/common";
import {JwtAuthGuard} from "@/modules/auth/guards/jwt-auth.guard";
import {LeadsService} from "@/modules/leads/leads.service";
import {CurrentUser} from "@/common/decorators/current-user.decorator";
import {AuthUser} from "@/common/types/auth-user.type";
import {QueryLeadsDto} from "@/modules/leads/dto/query-leads.dto";
import {CreateLeadDto} from "@/modules/leads/dto/create-lead.dto";
import {UpdateLeadDto} from "@/modules/leads/dto/update-lead.dto";

@UseGuards(JwtAuthGuard)
@Controller("leads")
export class LeadsController {
    constructor(private readonly leadsService: LeadsService) {}

    @Get()
    findAll(@CurrentUser() user: AuthUser, @Query() query: QueryLeadsDto) {
        return this.leadsService.findAll(user, query);
    }

    @Post()
    create(@CurrentUser() user: AuthUser, @Body() dto: CreateLeadDto) {
        return this.leadsService.create(user, dto);
    }

    @Get(":id")
    findOne(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.leadsService.findOne(user, id);
    }

    @Patch(":id")
    update(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: UpdateLeadDto,
    ) {
        return this.leadsService.update(user, id, dto);
    }

    @Delete(":id")
    remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.leadsService.remove(user, id);
    }
}