import {Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards} from "@nestjs/common";
import {JwtAuthGuard} from "@/modules/auth/guards/jwt-auth.guard";
import { CompanyGuard } from "@/common/guards/company.guard";
import { RolesGuard } from "@/common/guards/roles.guard";
import { ProjectsService } from "./projects.service";
import {Roles} from "@/common/decorators/roles.decorator";
import {UserRole} from "@/generated/prisma/enums";
import {CurrentUser} from "@/common/decorators/current-user.decorator";
import {AuthUser} from "@/common/types/auth-user.type";
import {QueryProjectsDto} from "@/modules/projects/dto/query-projects.dto";
import {CreateProjectDto} from "@/modules/projects/dto/create-project.dto";
import {UpdateProjectDto} from "@/modules/projects/dto/update-project.dto";

@UseGuards(JwtAuthGuard, CompanyGuard, RolesGuard)
@Controller("projects")
export class ProjectsController {
    constructor(private readonly projectsService: ProjectsService) {}

    @Roles(
        UserRole.COMPANY_ADMIN,
        UserRole.SALES_HEAD,
        UserRole.SALES_MANAGER,
        UserRole.FINANCE,
    )
    @Get()
    findAll(@CurrentUser() user: AuthUser, @Query() query: QueryProjectsDto) {
        return this.projectsService.findAll(user, query);
    }

    @Roles(
        UserRole.COMPANY_ADMIN,
        UserRole.SALES_HEAD,
        UserRole.SALES_MANAGER,
        UserRole.FINANCE,
    )
    @Get(":id")
    findOne(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.projectsService.findOne(user, id);
    }

    @Roles(UserRole.COMPANY_ADMIN)
    @Post()
    create(@CurrentUser() user: AuthUser, @Body() dto: CreateProjectDto) {
        return this.projectsService.create(user, dto);
    }

    @Roles(UserRole.COMPANY_ADMIN)
    @Patch(":id")
    update(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: UpdateProjectDto,
    ) {
        return this.projectsService.update(user, id, dto);
    }

    @Roles(UserRole.COMPANY_ADMIN)
    @Delete(":id")
    remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.projectsService.remove(user, id);
    }
}