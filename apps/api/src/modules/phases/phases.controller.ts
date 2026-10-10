import {Body, Controller, Delete, Get, Param, Patch, Post, UseGuards} from "@nestjs/common";
import {JwtAuthGuard} from "@/modules/auth/guards/jwt-auth.guard";
import {CompanyGuard} from "@/common/guards/company.guard";
import {PermissionsGuard} from "@/common/guards/permissions.guard";
import {RequirePermissions} from "@/common/decorators/permissions.decorator";
import {CurrentUser} from "@/common/decorators/current-user.decorator";
import {AuthUser} from "@/common/types/auth-user.type";
import {PhasesService} from "./phases.service";
import {CreatePhaseDto} from "./dto/create-phase.dto";
import {UpdatePhaseDto} from "./dto/update-phase.dto";

@UseGuards(JwtAuthGuard, CompanyGuard, PermissionsGuard)
@Controller()
export class PhasesController {
    constructor(private readonly phasesService: PhasesService) {}

    @RequirePermissions("inventory.view")
    @Get("projects/:projectId/phases")
    findByProject(@CurrentUser() user: AuthUser, @Param("projectId") projectId: string) {
        return this.phasesService.findByProject(user, projectId);
    }

    @RequirePermissions("inventory.manage")
    @Post("projects/:projectId/phases")
    create(@CurrentUser() user: AuthUser, @Param("projectId") projectId: string, @Body() dto: CreatePhaseDto) {
        return this.phasesService.create(user, projectId, dto);
    }

    @RequirePermissions("inventory.manage")
    @Patch("phases/:id")
    update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: UpdatePhaseDto) {
        return this.phasesService.update(user, id, dto);
    }

    @RequirePermissions("inventory.manage")
    @Delete("phases/:id")
    remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.phasesService.remove(user, id);
    }
}
