import {Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards} from "@nestjs/common";
import {UserRole} from "@/generated/prisma/enums";
import {JwtAuthGuard} from "@/modules/auth/guards/jwt-auth.guard";
import {RolesGuard} from "@/common/guards/roles.guard";
import {Roles} from "@/common/decorators/roles.decorator";
import {CurrentUser} from "@/common/decorators/current-user.decorator";
import {AuthUser} from "@/common/types/auth-user.type";
import {CompaniesService} from "./companies.service";
import {CreateCompanyDto} from "./dto/create-company.dto";
import {UpdateCompanyDto} from "./dto/update-company.dto";
import {QueryCompaniesDto} from "./dto/query-companies.dto";

/**
 * Tenant administration, for the platform operator only.
 *
 * Deliberately does NOT use CompanyGuard. Every other controller does, and that
 * guard rejects any user without a companyId — which is precisely how a
 * SUPER_ADMIN (who belongs to no company) stays locked out of tenant data while
 * still being able to manage tenants here.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller("companies")
export class CompaniesController {
    constructor(private readonly companiesService: CompaniesService) {}

    @Get()
    findAll(@Query() query: QueryCompaniesDto) {
        return this.companiesService.findAll(query);
    }

    @Get(":id")
    findOne(@Param("id") id: string) {
        return this.companiesService.findOne(id);
    }

    @Post()
    create(@CurrentUser() actor: AuthUser, @Body() dto: CreateCompanyDto) {
        return this.companiesService.create(actor, dto);
    }

    @Patch(":id")
    update(@Param("id") id: string, @Body() dto: UpdateCompanyDto) {
        return this.companiesService.update(id, dto);
    }

    // Suspension is reversible; deletion is not. Kept as separate endpoints so
    // a client cannot turn one into the other by changing a payload field.
    @Post(":id/suspend")
    suspend(@CurrentUser() actor: AuthUser, @Param("id") id: string) {
        return this.companiesService.suspend(actor, id);
    }

    @Post(":id/resume")
    resume(@CurrentUser() actor: AuthUser, @Param("id") id: string) {
        return this.companiesService.resume(actor, id);
    }

    @Delete(":id")
    remove(@CurrentUser() actor: AuthUser, @Param("id") id: string) {
        return this.companiesService.remove(actor, id);
    }

    // Intervention on a tenant's own users, for when its COMPANY_ADMIN is
    // unreachable or is the person locked out. Deactivate/reactivate are kept
    // as separate endpoints for the same reason suspend/resume are: a mistyped
    // payload cannot turn one into the other.
    @Post(":id/users/:userId/deactivate")
    deactivateUser(
        @CurrentUser() actor: AuthUser,
        @Param("id") id: string,
        @Param("userId") userId: string,
    ) {
        return this.companiesService.deactivateUser(actor, id, userId);
    }

    @Post(":id/users/:userId/reactivate")
    reactivateUser(
        @CurrentUser() actor: AuthUser,
        @Param("id") id: string,
        @Param("userId") userId: string,
    ) {
        return this.companiesService.reactivateUser(actor, id, userId);
    }

    @Post(":id/users/:userId/reset-password")
    resetUserPassword(
        @CurrentUser() actor: AuthUser,
        @Param("id") id: string,
        @Param("userId") userId: string,
    ) {
        return this.companiesService.resetUserPassword(actor, id, userId);
    }

    @Post(":id/users/:userId/impersonate")
    impersonateUser(
        @CurrentUser() actor: AuthUser,
        @Param("id") id: string,
        @Param("userId") userId: string,
    ) {
        return this.companiesService.impersonateUser(actor, id, userId);
    }
}
