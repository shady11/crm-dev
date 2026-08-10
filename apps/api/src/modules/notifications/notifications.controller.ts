import {Controller, Get, Param, Patch, Post, Query, UseGuards} from "@nestjs/common";
import {JwtAuthGuard} from "@/modules/auth/guards/jwt-auth.guard";
import {CompanyGuard} from "@/common/guards/company.guard";
import {CurrentUser} from "@/common/decorators/current-user.decorator";
import {AuthUser} from "@/common/types/auth-user.type";
import {NotificationsService} from "./notifications.service";
import {QueryNotificationsDto} from "./dto/query-notifications.dto";

@UseGuards(JwtAuthGuard, CompanyGuard)
@Controller("notifications")
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) {}

    @Get()
    findAll(@CurrentUser() user: AuthUser, @Query() query: QueryNotificationsDto) {
        return this.notificationsService.findAll(user, query);
    }

    @Get("unread-count")
    getUnreadCount(@CurrentUser() user: AuthUser) {
        return this.notificationsService.getUnreadCount(user);
    }

    @Patch(":id/read")
    markAsRead(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.notificationsService.markAsRead(user, id);
    }

    @Post("read-all")
    markAllAsRead(@CurrentUser() user: AuthUser) {
        return this.notificationsService.markAllAsRead(user);
    }
}