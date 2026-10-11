import {useMemo, useState} from "react";
import {useSearchParams} from "react-router-dom";
import {useQuery} from "@tanstack/react-query";
import {
    DEAL_ATTENTION_FILTERS,
    type DealAttentionFilter,
    type DealSortField,
    getDeals,
    getDealStatusSummary,
} from "@/features/deals/api/deals.api";
import {DealStatus} from "@/features/deals/types/deal.types";
import {useSort} from "@/hooks/use-sort.ts";
import {useDebouncedValue} from "@/hooks/use-debounced-value.ts";

export type DealStatusFilter = DealStatus | "all";

export function useDealsList() {
    const [statusFilter, setStatusFilterState] = useState<DealStatusFilter>("all");
    const [search, setSearchState] = useState("");
    const [page, setPage] = useState(1);
    const [limit, setLimitState] = useState(10);

    const [projectId, setProjectIdState] = useState<string | undefined>();
    const [managerId, setManagerIdState] = useState<string | undefined>();
    const [branchId, setBranchIdState] = useState<string | undefined>();
    // In the URL, so the dashboard's "View all" can open the list pre-filtered.
    const [searchParams, setSearchParams] = useSearchParams();
    const attentionParam = searchParams.get("attention");
    const attention = DEAL_ATTENTION_FILTERS.find((f) => f === attentionParam);
    const {sortBy, sortOrder, toggleSort} = useSort<DealSortField>();
    const debouncedSearch = useDebouncedValue(search);

    const tableQuery = useQuery({
        queryKey: ["deals", { statusFilter, search: debouncedSearch, projectId, managerId, branchId, attention, page, limit, sortBy, sortOrder }],
        queryFn: () =>
            getDeals({
                page, limit,
                status: statusFilter === "all" ? undefined : statusFilter,
                search: debouncedSearch || undefined,
                projectId,
                managerId,
                branchId,
                attention,
                sortBy,
                sortOrder,
            }),
    });

    const summaryQuery = useQuery({
        queryKey: ["deals", "status-summary", branchId],
        queryFn: () => getDealStatusSummary(undefined, branchId),
    });

    const countsByStatus = useMemo(() => {
        const map = new Map<DealStatus, number>();
        for (const item of summaryQuery.data ?? []) {
            map.set(item.status, item.count);
        }
        return map;
    }, [summaryQuery.data]);

    const deals = tableQuery.data?.items ?? [];
    const meta = tableQuery.data?.meta;

    return {
        filters: {
            statusFilter,
            setStatusFilter: (value: DealStatusFilter) => {
                setStatusFilterState(value);
                setPage(1);
            },
            search,
            setSearch: (value: string) => {
                setSearchState(value);
                setPage(1);
            },
            projectId,
            setProjectId: (value: string | undefined) => { setProjectIdState(value); setPage(1); },
            managerId,
            setManagerId: (value: string | undefined) => { setManagerIdState(value); setPage(1); },
            branchId,
            setBranchId: (value: string | undefined) => { setBranchIdState(value); setPage(1); },
            attention,
            setAttention: (value: DealAttentionFilter | undefined) => {
                setSearchParams((prev) => {
                    const params = new URLSearchParams(prev);
                    if (value) params.set("attention", value);
                    else params.delete("attention");
                    return params;
                }, { replace: true });
                setPage(1);
            },
        },
        pagination: {
            page,
            limit,
            total: meta?.total ?? 0,
            setPage,
            setLimit: (value: number) => {
                setLimitState(value);
                setPage(1);
            },
        },
        table: {
            deals,
            isLoading: tableQuery.isLoading,
            sortBy,
            sortOrder,
            toggleSort: (field: DealSortField) => {
                toggleSort(field);
                setPage(1);
            },
        },
        statusSummary: {
            countsByStatus,
        },
    };
}