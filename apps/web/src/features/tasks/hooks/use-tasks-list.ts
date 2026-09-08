import {useMemo, useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {getTasks, getTaskStatusSummary} from "@/features/tasks/api/tasks.api.ts";
import {TaskStatus} from "@/features/tasks/types/task.types.ts";

export type TaskStatusFilter = TaskStatus | "all";

export function useTasksList() {
    const [statusFilter, setStatusFilterState] = useState<TaskStatusFilter>("all");
    const [search, setSearchState] = useState("");
    const [assignedToId, setAssignedToIdState] = useState<string | undefined>();
    const [branchId, setBranchIdState] = useState<string | undefined>();
    const [page, setPage] = useState(1);
    const [limit, setLimitState] = useState(10);

    const tableQuery = useQuery({
        queryKey: ["tasks", { statusFilter, search, assignedToId, branchId, page, limit }],
        queryFn: () =>
            getTasks({
                page, limit,
                status: statusFilter === "all" ? undefined : statusFilter,
                search: search || undefined,
                assignedToId,
                branchId,
            }),
    });

    const summaryQuery = useQuery({
        queryKey: ["tasks", "status-summary", branchId],
        queryFn: () => getTaskStatusSummary(branchId),
    });

    const countsByStatus = useMemo(() => {
        const map = new Map<TaskStatus, number>();
        for (const item of summaryQuery.data ?? []) map.set(item.status, item.count);
        return map;
    }, [summaryQuery.data]);

    const tasks = tableQuery.data?.items ?? [];
    const meta = tableQuery.data?.meta;

    return {
        filters: {
            statusFilter,
            setStatusFilter: (v: TaskStatusFilter) => { setStatusFilterState(v); setPage(1); },
            search,
            setSearch: (v: string) => { setSearchState(v); setPage(1); },
            assignedToId,
            setAssignedToId: (v: string | undefined) => { setAssignedToIdState(v); setPage(1); },
            branchId,
            setBranchId: (v: string | undefined) => { setBranchIdState(v); setPage(1); },
        },
        pagination: {
            page, limit, total: meta?.total ?? 0,
            setPage,
            setLimit: (v: number) => { setLimitState(v); setPage(1); },
        },
        table: { tasks, isLoading: tableQuery.isLoading },
        statusSummary: { countsByStatus },
    };
}