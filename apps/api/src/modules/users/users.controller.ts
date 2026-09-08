import {Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards} from "@nestjs/common";
import {UserRole} from "@/generated/prisma/enums";
import {JwtAuthGuard} from "@/modules/auth/guards/jwt-auth.guard";
import {CompanyGuard} from "@/common/guards/company.guard";
import {RolesGuard} from "@/common/guards/roles.guard";
import {Roles} from "@/common/decorators/roles.decorator";
import {CurrentUser} from "@/common/decorators/current-user.decorator";
import {AuthUser} from "@/common/types/auth-user.type";
import {UsersService} from "./users.service";
import {CreateUserDto} from "./dto/create-user.dto";
import {UpdateUserDto} from "./dto/update-user.dto";
import {UpdateUserPasswordDto} from "./dto/update-user-password.dto";
import {DeactivateUserDto} from "./dto/deactivate-user.dto";
import {TransferUserBranchDto} from "./dto/transfer-user-branch.dto";
import {QueryUsersDto} from "./dto/query-users.dto";

@UseGuards(JwtAuthGuard, CompanyGuard, RolesGuard)
@Controller("users")
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Roles(UserRole.COMPANY_ADMIN, UserRole.SALES_HEAD)
    @Get()
    findAll(@CurrentUser() user: AuthUser, @Query() query: QueryUsersDto) {
        return this.usersService.findAll(user, query);
    }

    @Roles(UserRole.COMPANY_ADMIN, UserRole.SALES_HEAD)
    @Get("role-summary")
    getRoleSummary(@CurrentUser() user: AuthUser) {
        return this.usersService.getRoleSummary(user);
    }

    @Roles(UserRole.COMPANY_ADMIN, UserRole.SALES_HEAD)
    @Get(":id")
    findOne(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.usersService.findOne(user, id);
    }

    @Roles(UserRole.COMPANY_ADMIN)
    @Post()
    create(@CurrentUser() user: AuthUser, @Body() dto: CreateUserDto) {
        return this.usersService.create(user, dto);
    }

    @Roles(UserRole.COMPANY_ADMIN)
    @Patch(":id")
    update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: UpdateUserDto) {
        return this.usersService.update(user, id, dto);
    }

    @Roles(UserRole.COMPANY_ADMIN)
    @Patch(":id/password")
    updatePassword(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: UpdateUserPasswordDto,
    ) {
        return this.usersService.updatePassword(user, id, dto);
    }

    @Roles(UserRole.COMPANY_ADMIN)
    @Post(":id/revoke-sessions")
    revokeSessions(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.usersService.revokeSessions(user, id);
    }

    // Read before showing the deactivation confirmation — tells the caller
    // whether this user still has open leads or active deals to reassign.
    @Roles(UserRole.COMPANY_ADMIN)
    @Get(":id/deactivation-impact")
    getDeactivationImpact(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.usersService.getDeactivationImpact(user, id);
    }

    // Same effect as DELETE below, plus an optional reassignment step. Kept as
    // its own POST endpoint rather than a DELETE body — a body on a DELETE
    // request is not something every client/proxy carries reliably.
    @Roles(UserRole.COMPANY_ADMIN)
    @Post(":id/deactivate")
    deactivate(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: DeactivateUserDto,
    ) {
        return this.usersService.remove(user, id, dto);
    }

    @Roles(UserRole.COMPANY_ADMIN)
    @Delete(":id")
    remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.usersService.remove(user, id);
    }

    // Read before showing the branch-transfer confirmation — tells the caller
    // whether this user still has open leads or active deals to reassign.
    @Roles(UserRole.COMPANY_ADMIN)
    @Get(":id/branch-transfer-impact")
    getBranchTransferImpact(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.usersService.getBranchTransferImpact(user, id);
    }

    @Roles(UserRole.COMPANY_ADMIN)
    @Post(":id/transfer-branch")
    transferBranch(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: TransferUserBranchDto,
    ) {
        return this.usersService.transferBranch(user, id, dto);
    }
}