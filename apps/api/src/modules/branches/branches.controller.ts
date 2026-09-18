import {Body, Controller, Get, Param, Patch, Post, Query, UseGuards} from "@nestjs/common";
import {JwtAuthGuard} from "@/modules/auth/guards/jwt-auth.guard";
import {CompanyGuard} from "@/common/guards/company.guard";
import {PermissionsGuard} from "@/common/guards/permissions.guard";
import {RequirePermissions} from "@/common/decorators/permissions.decorator";
import {CurrentUser} from "@/common/decorators/current-user.decorator";
import {AuthUser} from "@/common/types/auth-user.type";
import {BranchesService} from "./branches.service";
import {CreateBranchDto} from "./dto/create-branch.dto";
import {UpdateBranchDto} from "./dto/update-branch.dto";
import {QueryBranchesDto} from "./dto/query-branches.dto";

// No BranchGuard here — branches are what branch-scoping is built from, not
// branch-scoped data themselves.
@UseGuards(JwtAuthGuard, CompanyGuard, PermissionsGuard)
@Controller("branches")
export class BranchesController {
    constructor(private readonly branchesService: BranchesService) {}

    @RequirePermissions("branches.view")
    @Get()
    findAll(@CurrentUser() user: AuthUser, @Query() query: QueryBranchesDto) {
        return this.branchesService.findAll(user, query);
    }

    @RequirePermissions("branches.view")
    @Get(":id")
    findOne(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.branchesService.findOneWithUsers(user, id);
    }

    @RequirePermissions("branches.create")
    @Post()
    create(@CurrentUser() user: AuthUser, @Body() dto: CreateBranchDto) {
        return this.branchesService.create(user, dto);
    }

    @RequirePermissions("branches.edit")
    @Patch(":id")
    update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: UpdateBranchDto) {
        return this.branchesService.update(user, id, dto);
    }

    @RequirePermissions("branches.edit")
    @Post(":id/deactivate")
    deactivate(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.branchesService.deactivate(user, id);
    }

    @RequirePermissions("branches.edit")
    @Post(":id/reactivate")
    reactivate(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.branchesService.reactivate(user, id);
    }
}
