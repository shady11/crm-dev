import {Controller, Get, Query, UseGuards} from "@nestjs/common";
import {JwtAuthGuard} from "@/modules/auth/guards/jwt-auth.guard";
import {CompanyGuard} from "@/common/guards/company.guard";
import {RolesGuard} from "@/common/guards/roles.guard";
import {Roles} from "@/common/decorators/roles.decorator";
import {UserRole} from "@/generated/prisma/enums";
import {CurrentUser} from "@/common/decorators/current-user.decorator";
import {AuthUser} from "@/common/types/auth-user.type";
import {DashboardService} from "./dashboard.service";

// No BranchGuard here — branch filtering is applied conditionally inside the
// service (BR-B1 auto-filter, BR-B3 optional branchId param), not via a
// blanket controller guard. See tenant-boundary.spec.ts's NO_BRANCH_SCOPE.
@UseGuards(JwtAuthGuard, CompanyGuard, RolesGuard)
@Controller("dashboard")
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) {}

    @Get("kpis")
    getKpis(
        @CurrentUser() user: AuthUser,
        @Query("projectId") projectId?: string,
        @Query("branchId") branchId?: string,
    ) {
        return this.dashboardService.getKpis(user, projectId, branchId);
    }

    @Get("revenue-trend")
    getRevenueTrend(
        @CurrentUser() user: AuthUser,
        @Query("projectId") projectId?: string,
        @Query("branchId") branchId?: string,
    ) {
        return this.dashboardService.getRevenueTrend(user, projectId, branchId);
    }

    @Get("units-summary")
    getUnitsSummary(@CurrentUser() user: AuthUser, @Query("projectId") projectId?: string) {
        return this.dashboardService.getUnitsSummary(user, projectId);
    }

    @Get("attention")
    getAttentionItems(
        @CurrentUser() user: AuthUser,
        @Query("projectId") projectId?: string,
        @Query("branchId") branchId?: string,
    ) {
        return this.dashboardService.getAttentionItems(user, projectId, branchId);
    }

    @Get("recent-activity")
    getRecentActivity(
        @CurrentUser() user: AuthUser,
        @Query("projectId") projectId?: string,
        @Query("branchId") branchId?: string,
    ) {
        return this.dashboardService.getRecentActivity(user, projectId, branchId);
    }

    // BR-E1: cross-branch comparison, COMPANY_ADMIN only — branch-scoped
    // roles have no use for it and shouldn't be able to enumerate other
    // branches' numbers.
    @Roles(UserRole.COMPANY_ADMIN)
    @Get("branch-comparison")
    getBranchComparison(@CurrentUser() user: AuthUser) {
        return this.dashboardService.getBranchComparison(user);
    }

    // SH-A2: a SALES_HEAD's own-team snapshot. SALES_HEAD only — this is the
    // team-lead's standup view, not a company-wide report COMPANY_ADMIN would
    // reach for (they have branch-comparison above instead).
    @Roles(UserRole.SALES_HEAD)
    @Get("team-snapshot")
    getTeamSnapshot(@CurrentUser() user: AuthUser) {
        return this.dashboardService.getTeamSnapshot(user);
    }

    // SM-A2: a SALES_MANAGER's own "what needs doing today" view.
    // SALES_MANAGER only — this is the individual contributor's standup view,
    // not the team-lead rollup SALES_HEAD gets from team-snapshot above.
    @Roles(UserRole.SALES_MANAGER)
    @Get("my-work-today")
    getMyWorkToday(@CurrentUser() user: AuthUser) {
        return this.dashboardService.getMyWorkToday(user);
    }

    // SM-D1: a SALES_MANAGER's own deal count and conversion rate over a
    // period. Self-scoped only, deliberately with no cross-visibility into
    // teammates — see DashboardService.getMyPerformance.
    @Roles(UserRole.SALES_MANAGER)
    @Get("my-performance")
    getMyPerformance(@CurrentUser() user: AuthUser, @Query("days") days?: string) {
        const parsed = Number(days);
        return this.dashboardService.getMyPerformance(user, Number.isFinite(parsed) && parsed > 0 ? parsed : 30);
    }
}