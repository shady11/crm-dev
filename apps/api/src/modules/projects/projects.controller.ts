import {Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards} from "@nestjs/common";
import {JwtAuthGuard} from "@/modules/auth/guards/jwt-auth.guard";
import { CompanyGuard } from "@/common/guards/company.guard";
import { PermissionsGuard } from "@/common/guards/permissions.guard";
import { ProjectsService } from "./projects.service";
import {RequirePermissions} from "@/common/decorators/permissions.decorator";
import {CurrentUser} from "@/common/decorators/current-user.decorator";
import {AuthUser} from "@/common/types/auth-user.type";
import {QueryProjectsDto} from "@/modules/projects/dto/query-projects.dto";
import {CreateProjectDto} from "@/modules/projects/dto/create-project.dto";
import {UpdateProjectDto} from "@/modules/projects/dto/update-project.dto";

@UseGuards(JwtAuthGuard, CompanyGuard, PermissionsGuard)
@Controller("projects")
export class ProjectsController {
    constructor(private readonly projectsService: ProjectsService) {}

    @RequirePermissions("projects.view")
    @Get()
    findAll(@CurrentUser() user: AuthUser, @Query() query: QueryProjectsDto) {
        return this.projectsService.findAll(user, query);
    }

    @RequirePermissions("projects.view")
    @Get(":id")
    findOne(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.projectsService.findOne(user, id);
    }

    @RequirePermissions("projects.create")
    @Post()
    create(@CurrentUser() user: AuthUser, @Body() dto: CreateProjectDto) {
        return this.projectsService.create(user, dto);
    }

    @RequirePermissions("projects.edit")
    @Patch(":id")
    update(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: UpdateProjectDto,
    ) {
        return this.projectsService.update(user, id, dto);
    }

    @RequirePermissions("projects.delete")
    @Delete(":id")
    remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.projectsService.remove(user, id);
    }

    @RequirePermissions("projects.view")
    @Get(":id/tree")
    getTree(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.projectsService.getTree(user, id);
    }
}
