import type {QueryClient} from "@tanstack/react-query";
import type {Task} from "@/features/tasks/api/tasks.api.ts";
import type {TaskStatus} from "@/features/tasks/types/task.types.ts";

export function applyTaskStatusOptimistically(queryClient: QueryClient, taskId: string, status: TaskStatus) {
    queryClient.setQueriesData<{ items: Task[] }>(
        { queryKey: ["tasks"] },
        (old) => {
            if (!old?.items) return old;
            return { ...old, items: old.items.map((t) => (t.id === taskId ? { ...t, status } : t)) };
        },
    );
}