import {useQuery} from "@tanstack/react-query";
import {getTaskAssignees} from "@/features/tasks/api/tasks.api.ts";

/**
 * People a task can be assigned to, and the tasks list can be filtered by.
 * GET /tasks/assignees applies the same rule as saving a task (the
 * caller's branch for a branch-scoped role), and needs only tasks.view, so
 * a Sales Manager or Finance gets a list too.
 */
export function useTaskAssignees() {
    const query = useQuery({
        // Not under ["tasks"]: that prefix is the task lists, which status changes
        // rewrite optimistically and refetch.
        queryKey: ["users", "task-assignees"],
        queryFn: getTaskAssignees,
        staleTime: 5 * 60 * 1000,
    });
    return {...query, data: query.data ?? []};
}
