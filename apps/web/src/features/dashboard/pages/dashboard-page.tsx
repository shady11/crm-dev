import {useState} from "react";
import {createListCollection} from "@ark-ui/react";
import {BriefcaseIcon, DollarSignIcon, HouseIcon, ListTodoIcon} from "lucide-react";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {KpiCard} from "@/features/dashboard/components/kpi-card.tsx";
import {RevenueTrendChart} from "@/features/dashboard/components/revenue-trend-chart.tsx";
import {UnitsInventoryChart} from "@/features/dashboard/components/units-inventory-chart.tsx";
import {AttentionCard} from "@/features/dashboard/components/attention-card.tsx";
import {RecentActivityCard} from "@/features/dashboard/components/recent-activity-card.tsx";
import {BranchComparisonChart} from "@/features/dashboard/components/branch-comparison-chart.tsx";
import {TeamSnapshotCard} from "@/features/dashboard/components/team-snapshot-card.tsx";
import {MyWorkTodayCard} from "@/features/dashboard/components/my-work-today-card.tsx";
import {MyPerformanceCard} from "@/features/dashboard/components/my-performance-card.tsx";
import {DealStatusCardsGrid} from "@/features/deals/components/deal-status-cards-grid.tsx";
import {FunnelCard} from "@/features/dashboard/components/funnel-card.tsx";
import {FinanceOverviewCard} from "@/features/dashboard/components/finance-overview-card.tsx";
import {
    useBranchComparison,
    useDashboard,
    useFinanceOverview,
    useMyPerformance,
    useMyWorkToday,
    useTeamSnapshot,
} from "@/features/dashboard/hooks/use-dashboard.ts";
import {EMPTY_ATTENTION_ITEMS} from "@/features/dashboard/api/dashboard.api.ts";
import {useProjectsFilter} from "@/features/projects/hooks/use-projects-filter.ts";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";
import {useAuth} from "@/features/auth/hooks/use-auth.ts";
import {BranchFilterSelect} from "@/features/branches/components/branch-filter-select";
import {hasPermission} from "@/features/auth/access";
import {useManagers} from "@/features/users/hooks/use-managers.ts";
import {paths} from "@/routes/paths.ts";
import {useTranslation} from "react-i18next";

export function DashboardPage() {
    const { t } = useTranslation("dashboard");
    const { user } = useAuth();
    const [projectId, setProjectId] = useState<string | undefined>();
    const [branchId, setBranchId] = useState<string | "all">("all");
    const [funnelManagerId, setFunnelManagerId] = useState<string | undefined>();
    const { formatCurrency } = useCompanyFormatters();
    const projects = useProjectsFilter();
    const { kpis, revenueTrend, unitsSummary, attention, recentActivity, dealsStatus, funnel } = useDashboard(
        projectId,
        branchId === "all" ? undefined : branchId,
        funnelManagerId,
    );
    const canViewBranchComparison = hasPermission(user, "dashboard.branch_comparison");
    const branchComparison = useBranchComparison(canViewBranchComparison);
    const canViewTeamSnapshot = hasPermission(user, "dashboard.team_snapshot");
    const teamSnapshot = useTeamSnapshot(canViewTeamSnapshot);
    const canViewMyPerformance = hasPermission(user, "dashboard.my_performance");
    // A Sales Head has leads and tasks of their own too.
    const canViewMyWorkToday = canViewMyPerformance || canViewTeamSnapshot;
    const myWorkToday = useMyWorkToday(canViewMyWorkToday);
    // Who the funnel can be split by: not offered to a manager, who only
    // ever sees their own; narrowed to the chosen branch for a company-wide
    // viewer.
    const managers = useManagers();
    const funnelManagers = canViewMyPerformance
        ? undefined
        : managers.data.filter((m) => branchId === "all" || m.branchId === branchId);
    const myPerformance = useMyPerformance(canViewMyPerformance);
    const canViewFinanceOverview = hasPermission(user, "dashboard.finance_overview");
    const financeOverview = useFinanceOverview(canViewFinanceOverview, branchId === "all" ? undefined : branchId);

    const projectCollection = createListCollection({
        items: [{ label: t("allProjects"), value: "all" }, ...projects.data.map((p) => ({ label: p.name, value: p.id }))],
    });

    // A Sales Manager starts from their own day (My work today); anyone
    // looking after a whole branch or company starts from what's waiting on
    // them, so their inbox goes to the top.
    const attentionCard = (
        <AttentionCard data={attention.data ?? EMPTY_ATTENTION_ITEMS} showOwner={!canViewMyPerformance} />
    );

    const countsByStatus = new Map(dealsStatus.data?.map((d) => [d.status, d.count]) ?? []);

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>

                <div className="flex flex-wrap items-center gap-2">
                    <BranchFilterSelect value={branchId} onChange={setBranchId} />

                    <Select
                        collection={projectCollection}
                        value={[projectId ?? "all"]}
                        onValueChange={({ value }) => setProjectId(value[0] === "all" ? undefined : value[0])}
                    >
                        <SelectTrigger className="w-56"><SelectValue placeholder={t("allProjects")} /></SelectTrigger>
                        <SelectContent>
                            {projectCollection.items.map((item) => <SelectItem key={item.value} item={item}>{item.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* A manager's own day comes first: what to do today, then how they're doing. */}
            {canViewMyPerformance && myWorkToday.data ? <MyWorkTodayCard data={myWorkToday.data} /> : null}
            {canViewMyPerformance && myPerformance.data ? <MyPerformanceCard data={myPerformance.data} /> : null}
            {canViewMyPerformance ? null : attentionCard}
            {/* A Sales Head's main block: their team, then their own day. */}
            {canViewTeamSnapshot ? <TeamSnapshotCard data={teamSnapshot.data ?? []} /> : null}
            {!canViewMyPerformance && canViewMyWorkToday && myWorkToday.data ? <MyWorkTodayCard data={myWorkToday.data} /> : null}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard
                    icon={DollarSignIcon}
                    label={t("kpi.revenueThisMonth")}
                    value={kpis.data ? formatCurrency(kpis.data.revenueThisMonth) : "—"}
                    accent="bg-emerald-500"
                />
                <KpiCard
                    icon={BriefcaseIcon}
                    label={t("kpi.activeDeals")}
                    value={kpis.data ? String(kpis.data.activeDealsCount) : "—"}
                    accent="bg-blue-500"
                    to={paths.deals.root}
                />
                <KpiCard
                    icon={HouseIcon}
                    label={t("kpi.availableUnits")}
                    value={kpis.data ? String(kpis.data.availableUnits) : "—"}
                    subtext={kpis.data ? t("kpi.unitsOfTotal", { total: kpis.data.totalUnits }) : undefined}
                    accent="bg-violet-500"
                    to={paths.projects.root}
                />
                <KpiCard
                    icon={ListTodoIcon}
                    label={t("kpi.overdueTasks")}
                    value={kpis.data ? String(kpis.data.overdueTasksCount) : "—"}
                    accent={kpis.data && kpis.data.overdueTasksCount > 0 ? "bg-rose-500" : "bg-gray-400"}
                    to={paths.tasks.root}
                />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <RevenueTrendChart data={revenueTrend.data ?? []} />
                </div>
                <UnitsInventoryChart data={unitsSummary.data ?? []} />
            </div>

            <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">{t("dealsByStage")}</h3>
                <DealStatusCardsGrid countsByStatus={countsByStatus} hrefFor={paths.deals.byStatus} />
            </div>

            {funnel.data ? (
                <FunnelCard
                    data={funnel.data}
                    projectId={projectId}
                    branchId={branchId === "all" ? undefined : branchId}
                    managerId={funnelManagerId}
                    managers={funnelManagers}
                    onManagerChange={setFunnelManagerId}
                />
            ) : null}

            {canViewMyPerformance ? (
                <div className="grid gap-4 lg:grid-cols-2">
                    {attentionCard}
                    <RecentActivityCard activities={recentActivity.data ?? []} />
                </div>
            ) : (
                <RecentActivityCard activities={recentActivity.data ?? []} />
            )}

            {canViewBranchComparison ? <BranchComparisonChart data={branchComparison.data ?? []} /> : null}
            {canViewFinanceOverview && financeOverview.data ? <FinanceOverviewCard data={financeOverview.data} /> : null}
        </div>
    );
}