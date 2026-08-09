import {useMemo} from "react";
import {useQuery} from "@tanstack/react-query";
import type {Task} from "@/features/tasks/api/tasks.api.ts";
import {getTasks} from "@/features/tasks/api/tasks.api.ts";
import {TaskStatus} from "@/features/tasks/types/task.types.ts";

interface UseTasksBoardParams {
    search?: string;
    assignedToId?: string;
}

export function useTasksBoard({ search, assignedToId }: UseTasksBoardParams) {
    const query = useQuery({
        queryKey: ["tasks", "board", { search, assignedToId }],
        queryFn: () => getTasks({ search, assignedToId, limit: 200, page: 1 }),
    });

    const tasksByStatus = useMemo(() => {
        const map = new Map<TaskStatus, Task[]>();
        for (const status of Object.values(TaskStatus)) map.set(status, []);
        for (const task of query.data?.items ?? []) {
            map.get(task.status)?.push(task);
        }
        return map;
    }, [query.data]);

    return { ...query, tasksByStatus };
}