import {Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards} from "@nestjs/common";
import {JwtAuthGuard} from "@/modules/auth/guards/jwt-auth.guard";
import { CompanyGuard } from "@/common/guards/company.guard";
import { PermissionsGuard } from "@/common/guards/permissions.guard";
import {RequirePermissions} from "@/common/decorators/permissions.decorator";
import {CurrentUser} from "@/common/decorators/current-user.decorator";
import {AuthUser} from "@/common/types/auth-user.type";
import {BranchGuard} from "@/common/guards/branch.guard";
import {TransferBranchDto} from "@/common/dto/transfer-branch.dto";
import {QueryClientsDto} from "@/modules/clients/dto/query-clients.dto";
import {CreateClientDto} from "@/modules/clients/dto/create-client.dto";
import {UpdateClientDto} from "@/modules/clients/dto/update-client.dto";
import {ClientsService} from "@/modules/clients/clients.service";

@UseGuards(JwtAuthGuard, CompanyGuard, BranchGuard, PermissionsGuard)
@Controller("clients")
export class ClientsController {
    constructor(private readonly clientsService: ClientsService) {}

    @RequirePermissions("clients.view")
    @Get()
    findAll(@CurrentUser() user: AuthUser, @Query() query: QueryClientsDto) {
        return this.clientsService.findAll(user, query);
    }

    @RequirePermissions("clients.view")
    @Get(":id")
    findOne(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.clientsService.findOne(user, id);
    }

    @RequirePermissions("clients.create")
    @Post()
    create(@CurrentUser() user: AuthUser, @Body() dto: CreateClientDto) {
        return this.clientsService.create(user, dto);
    }

    @RequirePermissions("clients.edit")
    @Patch(":id")
    update(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: UpdateClientDto,
    ) {
        return this.clientsService.update(user, id, dto);
    }

    @RequirePermissions("clients.delete")
    @Delete(":id")
    remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.clientsService.remove(user, id);
    }

    // BR-D1: branch staff can't see across the boundary, so this can only
    // ever be reached by a company-wide role.
    @RequirePermissions("clients.transfer_branch")
    @Post(":id/transfer-branch")
    transferBranch(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: TransferBranchDto,
    ) {
        return this.clientsService.transferBranch(user, id, dto);
    }
}
