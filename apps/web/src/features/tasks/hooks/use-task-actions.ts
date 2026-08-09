import {useMutation, useQueryClient} from "@tanstack/react-query";
import {toast} from "@/components/ui/toast.tsx";
import {
    createTask,
    deleteTask,
    type Task,
    type TaskPayload,
    updateTask,
    updateTaskStatus
} from "@/features/tasks/api/tasks.api.ts";
import type {TaskStatus} from "@/features/tasks/types/task.types.ts";
import {applyTaskStatusOptimistically} from "@/features/tasks/utils/optimistic-status.ts";

export function useTaskActions() {
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ["tasks"] });

    const create = useMutation({
        mutationFn: (payload: TaskPayload) => createTask(payload),
        onSuccess: async () => { await invalidate(); toast.success({ title: "Task created" }); },
        onError: () => toast.error({ title: "Failed to create task" }),
    });

    const update = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: Partial<TaskPayload> }) => updateTask(id, payload),
        onSuccess: async () => { await invalidate(); toast.success({ title: "Task updated" }); },
        onError: () => toast.error({ title: "Failed to update task" }),
    });

    const changeStatus = useMutation({
        mutationFn: ({ id, status }: { id: string; status: TaskStatus }) => updateTaskStatus(id, status),

        onMutate: async ({ id, status }) => {
            await queryClient.cancelQueries({ queryKey: ["tasks"] });
            const previousQueries = queryClient.getQueriesData<{ items: Task[] }>({ queryKey: ["tasks"] });
            applyTaskStatusOptimistically(queryClient, id, status);
            return { previousQueries };
        },

        onError: (_err, _vars, context) => {
            context?.previousQueries?.forEach(([key, data]) => queryClient.setQueryData(key, data));
            toast.error({ title: "Failed to update status" });
        },

        onSettled: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
    });

    const remove = useMutation({
        mutationFn: (id: string) => deleteTask(id),
        onSuccess: async () => { await invalidate(); toast.success({ title: "Task deleted" }); },
        onError: () => toast.error({ title: "Failed to delete task" }),
    });

    return { create, update, changeStatus, remove };
}