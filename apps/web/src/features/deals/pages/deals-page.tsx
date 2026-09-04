import {DealStatusCardsGrid} from "@/features/deals/components/deal-status-cards-grid.tsx";
import {DealsToolbar} from "@/features/deals/components/deals-toolbar.tsx";
import {DealsTable} from "@/features/deals/components/deals-table.tsx";
import {DealsPagination} from "@/features/deals/components/deals-pagination.tsx";
import {useDealsList} from "@/features/deals/hooks/use-deals-list.ts";
import {useTranslation} from "react-i18next";

export function DealsPage() {
    const { t } = useTranslation("deals");
    const { filters, pagination, table, statusSummary } = useDealsList();

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <h2 className="text-2xl font-medium tracking-tight">{t("page.title")}</h2>
            </div>

            <DealStatusCardsGrid countsByStatus={statusSummary.countsByStatus} />

            <div className="space-y-4">
                <DealsToolbar
                    statusFilter={filters.statusFilter}
                    onStatusFilterChange={filters.setStatusFilter}
                    projectId={filters.projectId}
                    onProjectIdChange={filters.setProjectId}
                    managerId={filters.managerId}
                    onManagerIdChange={filters.setManagerId}
                    search={filters.search}
                    onSearchChange={filters.setSearch}
                />

                <DealsTable deals={table.deals} isLoading={table.isLoading} />

                <DealsPagination
                    page={pagination.page}
                    limit={pagination.limit}
                    total={pagination.total}
                    onPageChange={pagination.setPage}
                    onLimitChange={pagination.setLimit}
                />
            </div>
        </div>
    );
}