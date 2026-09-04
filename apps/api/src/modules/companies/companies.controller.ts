import {Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards} from "@nestjs/common";
import {UserRole} from "@/generated/prisma/enums";
import {JwtAuthGuard} from "@/modules/auth/guards/jwt-auth.guard";
import {RolesGuard} from "@/common/guards/roles.guard";
import {Roles} from "@/common/decorators/roles.decorator";
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
    create(@Body() dto: CreateCompanyDto) {
        return this.companiesService.create(dto);
    }

    @Patch(":id")
    update(@Param("id") id: string, @Body() dto: UpdateCompanyDto) {
        return this.companiesService.update(id, dto);
    }

    // Suspension is reversible; deletion is not. Kept as separate endpoints so
    // a client cannot turn one into the other by changing a payload field.
    @Post(":id/suspend")
    suspend(@Param("id") id: string) {
        return this.companiesService.suspend(id);
    }

    @Post(":id/resume")
    resume(@Param("id") id: string) {
        return this.companiesService.resume(id);
    }

    @Delete(":id")
    remove(@Param("id") id: string) {
        return this.companiesService.remove(id);
    }
}
