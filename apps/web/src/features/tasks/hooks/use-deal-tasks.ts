import {useQuery} from "@tanstack/react-query";
import {getTasks} from "@/features/tasks/api/tasks.api.ts";

export function useDealTasks(dealId: string) {
    const query = useQuery({
        queryKey: ["tasks", { dealId }],
        queryFn: () => getTasks({ dealId, limit: 50 }),
    });
    return { ...query, tasks: query.data?.items ?? [] };
}