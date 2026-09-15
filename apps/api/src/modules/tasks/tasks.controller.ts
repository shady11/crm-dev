import {Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards} from "@nestjs/common";
import {JwtAuthGuard} from "@/modules/auth/guards/jwt-auth.guard";
import {CompanyGuard} from "@/common/guards/company.guard";
import {BranchGuard} from "@/common/guards/branch.guard";
import {PermissionsGuard} from "@/common/guards/permissions.guard";
import {RequirePermissions} from "@/common/decorators/permissions.decorator";
import {CurrentUser} from "@/common/decorators/current-user.decorator";
import {AuthUser} from "@/common/types/auth-user.type";
import {TasksService} from "./tasks.service";
import {CreateTaskDto} from "./dto/create-task.dto";
import {UpdateTaskDto} from "./dto/update-task.dto";
import {UpdateTaskStatusDto} from "./dto/update-task-status.dto";
import {QueryTasksDto} from "./dto/query-tasks.dto";

@UseGuards(JwtAuthGuard, CompanyGuard, BranchGuard, PermissionsGuard)
@Controller("tasks")
export class TasksController {
    constructor(private readonly tasksService: TasksService) {}

    @RequirePermissions("tasks.view")
    @Get()
    findAll(@CurrentUser() user: AuthUser, @Query() query: QueryTasksDto) {
        return this.tasksService.findAll(user, query);
    }

    @RequirePermissions("tasks.view")
    @Get("status-summary")
    getStatusSummary(@CurrentUser() user: AuthUser, @Query("branchId") branchId?: string) {
        return this.tasksService.getStatusSummary(user, branchId);
    }

    @RequirePermissions("tasks.view")
    @Get(":id")
    findOne(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.tasksService.findOne(user, id);
    }

    @RequirePermissions("tasks.create")
    @Post()
    create(@CurrentUser() user: AuthUser, @Body() dto: CreateTaskDto) {
        return this.tasksService.create(user, dto);
    }

    @RequirePermissions("tasks.edit")
    @Patch(":id")
    update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: UpdateTaskDto) {
        return this.tasksService.update(user, id, dto);
    }

    @RequirePermissions("tasks.edit")
    @Patch(":id/status")
    updateStatus(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: UpdateTaskStatusDto) {
        return this.tasksService.updateStatus(user, id, dto);
    }

    @RequirePermissions("tasks.delete")
    @Delete(":id")
    remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.tasksService.remove(user, id);
    }
}
