import {useMemo, useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {getDeals, getDealStatusSummary} from "@/features/deals/api/deals.api";
import {DealStatus} from "@/features/deals/types/deal.types";

export type DealStatusFilter = DealStatus | "all";

export function useDealsList() {
    const [statusFilter, setStatusFilterState] = useState<DealStatusFilter>("all");
    const [search, setSearchState] = useState("");
    const [page, setPage] = useState(1);
    const [limit, setLimitState] = useState(10);

    const [projectId, setProjectIdState] = useState<string | undefined>();
    const [managerId, setManagerIdState] = useState<string | undefined>();

    const tableQuery = useQuery({
        queryKey: ["deals", { statusFilter, search, projectId, managerId, page, limit }],
        queryFn: () =>
            getDeals({
                page, limit,
                status: statusFilter === "all" ? undefined : statusFilter,
                search: search || undefined,
                projectId,
                managerId,
            }),
    });

    const summaryQuery = useQuery({
        queryKey: ["deals", "status-summary"],
        queryFn: getDealStatusSummary,
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
        },
        statusSummary: {
            countsByStatus,
        },
    };
}