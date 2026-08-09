import {Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards} from "@nestjs/common";
import {JwtAuthGuard} from "@/modules/auth/guards/jwt-auth.guard";
import {CompanyGuard} from "@/common/guards/company.guard";
import {RolesGuard} from "@/common/guards/roles.guard";
import {Roles} from "@/common/decorators/roles.decorator";
import {CurrentUser} from "@/common/decorators/current-user.decorator";
import {AuthUser} from "@/common/types/auth-user.type";
import {UserRole} from "@/generated/prisma/enums";
import {TasksService} from "./tasks.service";
import {CreateTaskDto} from "./dto/create-task.dto";
import {UpdateTaskDto} from "./dto/update-task.dto";
import {UpdateTaskStatusDto} from "./dto/update-task-status.dto";
import {QueryTasksDto} from "./dto/query-tasks.dto";

@UseGuards(JwtAuthGuard, CompanyGuard, RolesGuard)
@Controller("tasks")
export class TasksController {
    constructor(private readonly tasksService: TasksService) {}

    @Roles(UserRole.COMPANY_ADMIN, UserRole.SALES_HEAD, UserRole.SALES_MANAGER, UserRole.FINANCE)
    @Get()
    findAll(@CurrentUser() user: AuthUser, @Query() query: QueryTasksDto) {
        return this.tasksService.findAll(user, query);
    }

    @Roles(UserRole.COMPANY_ADMIN, UserRole.SALES_HEAD, UserRole.SALES_MANAGER, UserRole.FINANCE)
    @Get("status-summary")
    getStatusSummary(@CurrentUser() user: AuthUser) {
        return this.tasksService.getStatusSummary(user);
    }

    @Roles(UserRole.COMPANY_ADMIN, UserRole.SALES_HEAD, UserRole.SALES_MANAGER, UserRole.FINANCE)
    @Get(":id")
    findOne(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.tasksService.findOne(user, id);
    }

    @Roles(UserRole.COMPANY_ADMIN, UserRole.SALES_HEAD, UserRole.SALES_MANAGER, UserRole.FINANCE)
    @Post()
    create(@CurrentUser() user: AuthUser, @Body() dto: CreateTaskDto) {
        return this.tasksService.create(user, dto);
    }

    @Roles(UserRole.COMPANY_ADMIN, UserRole.SALES_HEAD, UserRole.SALES_MANAGER, UserRole.FINANCE)
    @Patch(":id")
    update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: UpdateTaskDto) {
        return this.tasksService.update(user, id, dto);
    }

    @Roles(UserRole.COMPANY_ADMIN, UserRole.SALES_HEAD, UserRole.SALES_MANAGER, UserRole.FINANCE)
    @Patch(":id/status")
    updateStatus(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: UpdateTaskStatusDto) {
        return this.tasksService.updateStatus(user, id, dto);
    }

    @Roles(UserRole.COMPANY_ADMIN, UserRole.SALES_HEAD)
    @Delete(":id")
    remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.tasksService.remove(user, id);
    }
}