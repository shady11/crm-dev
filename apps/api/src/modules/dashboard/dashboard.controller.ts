import {Controller, Get, Query, UseGuards} from "@nestjs/common";
import {JwtAuthGuard} from "@/modules/auth/guards/jwt-auth.guard";
import {CompanyGuard} from "@/common/guards/company.guard";
import {CurrentUser} from "@/common/decorators/current-user.decorator";
import {AuthUser} from "@/common/types/auth-user.type";
import {DashboardService} from "./dashboard.service";

@UseGuards(JwtAuthGuard, CompanyGuard)
@Controller("dashboard")
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) {}

    @Get("kpis")
    getKpis(@CurrentUser() user: AuthUser, @Query("projectId") projectId?: string) {
        return this.dashboardService.getKpis(user, projectId);
    }

    @Get("revenue-trend")
    getRevenueTrend(@CurrentUser() user: AuthUser, @Query("projectId") projectId?: string) {
        return this.dashboardService.getRevenueTrend(user, projectId);
    }

    @Get("units-summary")
    getUnitsSummary(@CurrentUser() user: AuthUser, @Query("projectId") projectId?: string) {
        return this.dashboardService.getUnitsSummary(user, projectId);
    }

    @Get("attention")
    getAttentionItems(@CurrentUser() user: AuthUser, @Query("projectId") projectId?: string) {
        return this.dashboardService.getAttentionItems(user, projectId);
    }

    @Get("recent-activity")
    getRecentActivity(@CurrentUser() user: AuthUser, @Query("projectId") projectId?: string) {
        return this.dashboardService.getRecentActivity(user, projectId);
    }
}