import {useParams} from "react-router-dom";
import {useQuery} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {useAuth} from "@/features/auth/hooks/use-auth.ts";
import {hasPermission} from "@/features/auth/access";
import {getUnitsSummary} from "@/features/dashboard/api/dashboard.api.ts";
import {useFinanceOverview} from "@/features/dashboard/hooks/use-dashboard.ts";
import {FinanceOverviewCard} from "@/features/dashboard/components/finance-overview-card.tsx";
import {UnitsInventoryChart} from "@/features/dashboard/components/units-inventory-chart.tsx";
import {getDealStatusSummary} from "@/features/deals/api/deals.api.ts";
import {DealStatusCardsGrid} from "@/features/deals/components/deal-status-cards-grid.tsx";
import {paths} from "@/routes/paths.ts";

/**
 * The project's Analytics tab: how it is selling. Moved out of Overview,
 * which now shows only what the project is made of. Same data and same
 * access rule (dashboard.view) as before; the tab is hidden without it.
 */
export function ProjectAnalytics() {
    const {projectId} = useParams();
    return projectId ? <ProjectSales projectId={projectId} /> : null;
}

/**
 * How the project is selling: what's free, held and sold, its deals by
 * stage, and (for the owner and Finance) the money collected and still
 * owed on it. The overview showed only how many blocks and units it has.
 */
function ProjectSales({projectId}: {projectId: string}) {
    const {t} = useTranslation(["projects", "dashboard"]);
    const {user} = useAuth();
    const unitsSummary = useQuery({
        queryKey: ["dashboard", "units-summary", {projectId}],
        queryFn: () => getUnitsSummary(projectId),
    });
    const dealsStatus = useQuery({
        queryKey: ["deals", "status-summary", {projectId}],
        queryFn: () => getDealStatusSummary(projectId),
    });
    const canViewFinance =
        hasPermission(user, "dashboard.finance_overview") || hasPermission(user, "dashboard.branch_comparison");
    const finance = useFinanceOverview(canViewFinance, undefined, projectId);
    const countsByStatus = new Map(dealsStatus.data?.map((d) => [d.status, d.count]) ?? []);

    return (
        <div className="space-y-6">
            {canViewFinance && finance.data ? <FinanceOverviewCard data={finance.data} /> : null}

            <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">{t("dashboard:dealsByStage")}</h3>
                <DealStatusCardsGrid
                    countsByStatus={countsByStatus}
                    hrefFor={(status) => paths.deals.byProjectStatus(projectId, status)}
                />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <UnitsInventoryChart data={unitsSummary.data ?? []} />
            </div>
        </div>
    );
}