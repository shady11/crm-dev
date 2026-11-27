import {useState} from "react";
import {createListCollection} from "@ark-ui/react";
import {DollarSignIcon, FileSignatureIcon, TrendingUpIcon, UserPlusIcon} from "lucide-react";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {KpiCard} from "@/features/dashboard/components/kpi-card.tsx";
import {PeriodDelta} from "@/features/dashboard/components/period-delta.tsx";
import {PeriodToggle} from "@/features/dashboard/components/period-toggle.tsx";
import {SalesTrendChart} from "@/features/dashboard/components/sales-trend-chart.tsx";
import {CollectionsCard} from "@/features/dashboard/components/collections-card.tsx";
import {InventoryByProjectCard} from "@/features/dashboard/components/inventory-by-project-card.tsx";
import {ManagerPerformanceCard} from "@/features/dashboard/components/manager-performance-card.tsx";
import {AttentionCard} from "@/features/dashboard/components/attention-card.tsx";
import {RecentActivityCard} from "@/features/dashboard/components/recent-activity-card.tsx";
import {BranchComparisonChart} from "@/features/dashboard/components/branch-comparison-chart.tsx";
import {TeamSnapshotCard} from "@/features/dashboard/components/team-snapshot-card.tsx";
import {MyWorkTodayCard} from "@/features/dashboard/components/my-work-today-card.tsx";
import {DealStatusCardsGrid} from "@/features/deals/components/deal-status-cards-grid.tsx";
import {FunnelCard} from "@/features/dashboard/components/funnel-card.tsx";
import {FinanceOverviewCard} from "@/features/dashboard/components/finance-overview-card.tsx";
import {GettingStartedCard} from "@/features/dashboard/components/getting-started-card.tsx";
import {
    useBranchComparison,
    useDashboard,
    useFinanceOverview,
    useInventoryByProject,
    useManagerPerformance,
    useMyWorkToday,
    useSalesSummary,
    useTeamSnapshot,
} from "@/features/dashboard/hooks/use-dashboard.ts";
import {type DashboardPeriod, EMPTY_ATTENTION_ITEMS} from "@/features/dashboard/api/dashboard.api.ts";
import {useProjectsFilter} from "@/features/projects/hooks/use-projects-filter.ts";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";
import {useAuth} from "@/features/auth/hooks/use-auth.ts";
import {BranchFilterSelect} from "@/features/branches/components/branch-filter-select";
import {hasPermission} from "@/features/auth/access";
import {useManagers} from "@/features/users/hooks/use-managers.ts";
import {paths} from "@/routes/paths.ts";
import {useTranslation} from "react-i18next";

const percent = (value: number) => `${Math.round(value * 100)}%`;

/**
 * The sales dashboard, top to bottom in the order a director reads it:
 * what needs doing, how the period is going against the last one (sold,
 * collected, new demand), the money still to come in, who's selling, what's
 * left to sell, and the pipeline. A Sales Manager sees the same blocks for
 * their own deals and leads only; the API scopes every number.
 */
export function DashboardPage() {
    const { t } = useTranslation("dashboard");
    const { user } = useAuth();
    const [period, setPeriod] = useState<DashboardPeriod>("month");
    const [projectId, setProjectId] = useState<string | undefined>();
    const [branchId, setBranchId] = useState<string | "all">("all");
    const [funnelManagerId, setFunnelManagerId] = useState<string | undefined>();
    const { formatCurrency, formatNumber } = useCompanyFormatters();
    const projects = useProjectsFilter();
    const selectedBranchId = branchId === "all" ? undefined : branchId;
    const { revenueTrend, attention, recentActivity, dealsStatus, funnel } = useDashboard(
        projectId,
        selectedBranchId,
        funnelManagerId,
    );
    const salesSummary = useSalesSummary(period, projectId, selectedBranchId);
    const inventory = useInventoryByProject(projectId);

    const canViewBranchComparison = hasPermission(user, "dashboard.branch_comparison");
    const branchComparison = useBranchComparison(canViewBranchComparison);
    const canViewTeamSnapshot = hasPermission(user, "dashboard.team_snapshot");
    // The owner sees every branch's managers, by the company-wide
    // permission, without the team lead's own "My work today".
    const canViewCompanyTeam = !canViewTeamSnapshot && canViewBranchComparison;
    const canViewTeam = canViewTeamSnapshot || canViewCompanyTeam;
    const teamSnapshot = useTeamSnapshot(canViewTeam, canViewCompanyTeam ? selectedBranchId : undefined);
    const managerPerformance = useManagerPerformance(canViewTeam, period, projectId, selectedBranchId);
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
    // Finance's own desk view: this month's cash by payment method and
    // what's coming due. The collections card covers everyone else.
    const canViewFinanceOverview = hasPermission(user, "dashboard.finance_overview");
    const financeOverview = useFinanceOverview(canViewFinanceOverview, selectedBranchId, projectId);
    // Leads and the funnel are the sales team's view; Finance has no leads to read.
    const canViewLeads = hasPermission(user, "leads.view");

    const projectCollection = createListCollection({
        items: [{ label: t("allProjects"), value: "all" }, ...projects.data.map((p) => ({ label: p.name, value: p.id }))],
    });

    const attentionCard = (
        <AttentionCard data={attention.data ?? EMPTY_ATTENTION_ITEMS} showOwner={!canViewMyPerformance} />
    );

    const countsByStatus = new Map(dealsStatus.data?.map((d) => [d.status, d.count]) ?? []);
    const summary = salesSummary.data;
    const delta = (key: "contractsSigned" | "salesVolume" | "cashCollected" | "newLeads", money: boolean) =>
        summary ? (
            <PeriodDelta
                current={summary.current[key]}
                previous={summary.previous[key]}
                period={period}
                formatPrevious={money ? formatCurrency : formatNumber}
            />
        ) : undefined;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>

                <div className="flex flex-wrap items-center gap-2">
                    <PeriodToggle value={period} onChange={setPeriod} />

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

            {/* SA-8: what a new company still has to set up, for whoever sets it up. */}
            {user?.companyId && hasPermission(user, "company_settings.edit") ? (
                <GettingStartedCard companyId={user.companyId} />
            ) : null}

            {/* A manager starts from their own day; anyone running a branch or
                the company from what's waiting on them. */}
            {canViewMyPerformance && myWorkToday.data ? <MyWorkTodayCard data={myWorkToday.data} /> : null}
            {canViewMyPerformance ? null : attentionCard}

            <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${canViewLeads ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
                <KpiCard
                    icon={FileSignatureIcon}
                    label={t("sales.contractsSigned")}
                    value={summary ? formatNumber(summary.current.contractsSigned) : "—"}
                    subtext={delta("contractsSigned", false)}
                    accent="bg-blue-500"
                    to={paths.deals.root}
                />
                <KpiCard
                    icon={TrendingUpIcon}
                    label={t("sales.salesVolume")}
                    value={summary ? formatCurrency(summary.current.salesVolume) : "—"}
                    subtext={delta("salesVolume", true)}
                    accent="bg-violet-500"
                />
                <KpiCard
                    icon={DollarSignIcon}
                    label={t("sales.cashCollected")}
                    value={summary ? formatCurrency(summary.current.cashCollected) : "—"}
                    subtext={delta("cashCollected", true)}
                    accent="bg-emerald-500"
                />
                {canViewLeads ? (
                    <KpiCard
                        icon={UserPlusIcon}
                        label={t("sales.newLeads")}
                        value={summary ? formatNumber(summary.current.newLeads) : "—"}
                        subtext={summary ? (
                            <>
                                {delta("newLeads", false)}
                                <p className="mt-1">{t("sales.conversion", { percent: percent(summary.current.conversionRate) })}</p>
                            </>
                        ) : undefined}
                        accent="bg-amber-500"
                        to={paths.leads}
                    />
                ) : null}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <SalesTrendChart data={revenueTrend.data ?? []} />
                </div>
                {summary ? <CollectionsCard data={summary.collections} period={period} /> : null}
            </div>

            {canViewFinanceOverview && financeOverview.data ? <FinanceOverviewCard data={financeOverview.data} /> : null}

            {/* Who's selling: results over the period, then today's workload. */}
            {canViewTeam ? (
                <ManagerPerformanceCard data={managerPerformance.data?.managers ?? []} isLoading={managerPerformance.isLoading} />
            ) : null}
            {canViewTeam ? <TeamSnapshotCard data={(teamSnapshot.data ?? []).filter((row) => !row.isViewer)} /> : null}
            {!canViewMyPerformance && canViewMyWorkToday && myWorkToday.data ? <MyWorkTodayCard data={myWorkToday.data} /> : null}

            <InventoryByProjectCard data={inventory.data ?? []} isLoading={inventory.isLoading} />

            <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">{t("dealsByStage")}</h3>
                <DealStatusCardsGrid countsByStatus={countsByStatus} hrefFor={paths.deals.byStatus} />
            </div>

            {canViewLeads && funnel.data ? (
                <FunnelCard
                    data={funnel.data}
                    projectId={projectId}
                    branchId={selectedBranchId}
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
        </div>
    );
}
