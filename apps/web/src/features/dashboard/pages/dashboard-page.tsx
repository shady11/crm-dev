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
import {DealStatusCardsGrid} from "@/features/deals/components/deal-status-cards-grid.tsx";
import {useBranchComparison, useDashboard, useTeamSnapshot} from "@/features/dashboard/hooks/use-dashboard.ts";
import {useProjectsFilter} from "@/features/projects/hooks/use-projects-filter.ts";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";
import {useAuth} from "@/features/auth/hooks/use-auth.ts";
import {BranchFilterSelect} from "@/features/branches/components/branch-filter-select";
import {UserRole} from "@/features/users/types/user.types";
import {useTranslation} from "react-i18next";

export function DashboardPage() {
    const { t } = useTranslation("dashboard");
    const { user } = useAuth();
    const [projectId, setProjectId] = useState<string | undefined>();
    const [branchId, setBranchId] = useState<string | "all">("all");
    const { formatCurrency } = useCompanyFormatters();
    const projects = useProjectsFilter();
    const { kpis, revenueTrend, unitsSummary, attention, recentActivity, dealsStatus } = useDashboard(
        projectId,
        branchId === "all" ? undefined : branchId,
    );
    const isCompanyAdmin = user?.role === UserRole.COMPANY_ADMIN;
    const branchComparison = useBranchComparison(isCompanyAdmin);
    const isSalesHead = user?.role === UserRole.SALES_HEAD;
    const teamSnapshot = useTeamSnapshot(isSalesHead);

    const projectCollection = createListCollection({
        items: [{ label: t("allProjects"), value: "all" }, ...projects.data.map((p) => ({ label: p.name, value: p.id }))],
    });

    const countsByStatus = new Map(dealsStatus.data?.map((d) => [d.status, d.count]) ?? []);

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-medium tracking-tight">{t("title")}</h2>

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
                />
                <KpiCard
                    icon={HouseIcon}
                    label={t("kpi.availableUnits")}
                    value={kpis.data ? String(kpis.data.availableUnits) : "—"}
                    subtext={kpis.data ? t("kpi.unitsOfTotal", { total: kpis.data.totalUnits }) : undefined}
                    accent="bg-violet-500"
                />
                <KpiCard
                    icon={ListTodoIcon}
                    label={t("kpi.overdueTasks")}
                    value={kpis.data ? String(kpis.data.overdueTasksCount) : "—"}
                    accent={kpis.data && kpis.data.overdueTasksCount > 0 ? "bg-rose-500" : "bg-gray-400"}
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
                <DealStatusCardsGrid countsByStatus={countsByStatus} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <AttentionCard data={attention.data ?? { expiringDeals: [], urgentTasks: [] }} />
                <RecentActivityCard activities={recentActivity.data ?? []} />
            </div>

            {isCompanyAdmin ? <BranchComparisonChart data={branchComparison.data ?? []} /> : null}
            {isSalesHead ? <TeamSnapshotCard data={teamSnapshot.data ?? []} /> : null}
        </div>
    );
}