import {Controller, Get, Headers, Query, Res, UseGuards, StreamableFile} from "@nestjs/common";
import type {Response} from "express";
import {exportLanguage} from "@/common/i18n/export-labels";
import {JwtAuthGuard} from "@/modules/auth/guards/jwt-auth.guard";
import {CompanyGuard} from "@/common/guards/company.guard";
import {PermissionsGuard} from "@/common/guards/permissions.guard";
import {RequirePermissions} from "@/common/decorators/permissions.decorator";
import {CurrentUser} from "@/common/decorators/current-user.decorator";
import {AuthUser} from "@/common/types/auth-user.type";
import {DashboardService, parseDashboardPeriod} from "./dashboard.service";

// No BranchGuard here — branch filtering is applied conditionally inside the
// service (BR-B1 auto-filter, BR-B3 optional branchId param), not via a
// blanket controller guard. See tenant-boundary.spec.ts's NO_BRANCH_SCOPE.
@UseGuards(JwtAuthGuard, CompanyGuard, PermissionsGuard)
@RequirePermissions("dashboard.view")
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

    // Headline numbers for a period against the same stretch of the previous one.
    @Get("sales-summary")
    getSalesSummary(
        @CurrentUser() user: AuthUser,
        @Query("period") period?: string,
        @Query("projectId") projectId?: string,
        @Query("branchId") branchId?: string,
    ) {
        return this.dashboardService.getSalesSummary(user, parseDashboardPeriod(period), projectId, branchId);
    }

    // Units are company-wide (BR-C1), so no branch param.
    @Get("inventory-by-project")
    getInventoryByProject(@CurrentUser() user: AuthUser, @Query("projectId") projectId?: string) {
        return this.dashboardService.getInventoryByProject(user, projectId);
    }

    // Per-manager results: a team lead's own branch, or the owner's
    // company (both read team rows already, by the snapshot above).
    @RequirePermissions("dashboard.team_snapshot", "dashboard.branch_comparison")
    @Get("manager-performance")
    getManagerPerformance(
        @CurrentUser() user: AuthUser,
        @Query("period") period?: string,
        @Query("projectId") projectId?: string,
        @Query("branchId") branchId?: string,
    ) {
        return this.dashboardService.getManagerPerformance(user, parseDashboardPeriod(period), projectId, branchId);
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

    // Lead → deal → won conversion funnel. Open to the same dashboard.view
    // permission as getKpis/getRevenueTrend above (no extra requirement)
    // since it's the same kind of company/branch-scoped overview, not a
    // cross-branch or team-lead-only report.
    @Get("funnel")
    getFunnel(
        @CurrentUser() user: AuthUser,
        @Query("projectId") projectId?: string,
        @Query("branchId") branchId?: string,
        @Query("managerId") managerId?: string,
    ) {
        // Empty means "everyone"; it only ever narrows within the caller's own scope.
        return this.dashboardService.getFunnel(user, projectId, branchId, managerId || undefined);
    }

    @Get("funnel/export")
    async exportFunnel(
        @CurrentUser() user: AuthUser,
        @Res({ passthrough: true }) res: Response,
        @Query("projectId") projectId?: string,
        @Query("branchId") branchId?: string,
        @Query("managerId") managerId?: string,
        @Headers("accept-language") acceptLanguage?: string,
    ) {
        const buffer = await this.dashboardService.exportFunnelXlsx(
            user, projectId, branchId, managerId || undefined, exportLanguage(acceptLanguage, user.company?.locale),
        );

        res.set({
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="funnel-${new Date().toISOString().slice(0, 10)}.xlsx"`,
        });

        // A bare Buffer is serialised as JSON ({"type":"Buffer",...});
        // StreamableFile sends the bytes, so Excel can open the file.
        return new StreamableFile(buffer);
    }

    // BR-E1: cross-branch comparison. dashboard.branch_comparison is only in
    // COMPANY_ADMIN's default bundle — branch-scoped roles have no use for it
    // and shouldn't be able to enumerate other branches' numbers.
    @RequirePermissions("dashboard.branch_comparison")
    @Get("branch-comparison")
    getBranchComparison(@CurrentUser() user: AuthUser) {
        return this.dashboardService.getBranchComparison(user);
    }

    // SH-A2: a SALES_HEAD's own-team snapshot (dashboard.team_snapshot).
    // The owner reads the same rows company-wide, by branch_comparison,
    // without taking on the team lead's own "My work today" and "My team"
    // page that team_snapshot also opens.
    @RequirePermissions("dashboard.team_snapshot", "dashboard.branch_comparison")
    @Get("team-snapshot")
    getTeamSnapshot(@CurrentUser() user: AuthUser, @Query("branchId") branchId?: string) {
        return this.dashboardService.getTeamSnapshot(user, branchId);
    }

    // Per-manager results over a period, for the Sales Head's "My team"
    // page. Same team-lead-only permission as the snapshot above.
    @RequirePermissions("dashboard.team_snapshot")
    @Get("team-performance")
    getTeamPerformance(@CurrentUser() user: AuthUser, @Query("days") days?: string) {
        const parsed = Number(days);
        return this.dashboardService.getTeamPerformance(user, Number.isFinite(parsed) && parsed > 0 ? parsed : 30);
    }

    // SM-A2/SM-D1: a SALES_MANAGER's own "what needs doing today" view and
    // own deal count/conversion rate. dashboard.my_performance is only in
    // SALES_MANAGER's default bundle — the individual contributor's standup
    // view, self-scoped only with no cross-visibility into teammates (see
    // DashboardService.getMyPerformance).
    // Also a team lead's (dashboard.team_snapshot): a Sales Head has leads
    // and tasks of their own too. The result is always the caller's own.
    @RequirePermissions("dashboard.my_performance", "dashboard.team_snapshot")
    @Get("my-work-today")
    getMyWorkToday(@CurrentUser() user: AuthUser) {
        return this.dashboardService.getMyWorkToday(user);
    }

    @RequirePermissions("dashboard.my_performance")
    @Get("my-performance")
    getMyPerformance(@CurrentUser() user: AuthUser, @Query("days") days?: string) {
        const parsed = Number(days);
        return this.dashboardService.getMyPerformance(user, Number.isFinite(parsed) && parsed > 0 ? parsed : 30);
    }

    // FIN-A1: a FINANCE user's collections/cash-flow overview. The owner
    // reads it too, by branch_comparison: finance_overview also marks its
    // holder as the finance desk (refund and schedule to-dos), which is
    // Finance's work, not the owner's.
    @RequirePermissions("dashboard.finance_overview", "dashboard.branch_comparison")
    @Get("finance-overview")
    getFinanceOverview(
        @CurrentUser() user: AuthUser,
        @Query("branchId") branchId?: string,
        @Query("projectId") projectId?: string,
    ) {
        return this.dashboardService.getFinanceOverview(user, branchId, projectId);
    }
}
