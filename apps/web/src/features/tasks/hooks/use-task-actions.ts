import {useMutation, useQueryClient} from "@tanstack/react-query";
import {toast} from "@/components/ui/toast.tsx";
import {useTranslation} from "react-i18next";
import {
    createTask,
    deleteTask,
    restoreTask,
    type Task,
    type TaskPayload,
    updateTask,
    updateTaskStatus
} from "@/features/tasks/api/tasks.api.ts";
import {TASK_STATUS_LABEL_KEYS, type TaskStatus} from "@/features/tasks/types/task.types.ts";
import {applyTaskStatusOptimistically} from "@/features/tasks/utils/optimistic-status.ts";
import {toastWithUndo} from "@/lib/undo-toast.ts";

export function useTaskActions() {
    const { t } = useTranslation("tasks");
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ["tasks"] });

    const create = useMutation({
        mutationFn: (payload: TaskPayload) => createTask(payload),
        onSuccess: async () => { await invalidate(); toast.success({ title: t("toasts.createSuccess") }); },
        onError: () => toast.error({ title: t("toasts.createError") }),
    });

    const update = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: Partial<TaskPayload> }) => updateTask(id, payload),
        onSuccess: async () => { await invalidate(); toast.success({ title: t("toasts.updateSuccess") }); },
        onError: () => toast.error({ title: t("toasts.updateError") }),
    });

    const changeStatus = useMutation({
        mutationFn: ({ id, status, outcome }: { id: string; status: TaskStatus; outcome?: string }) =>
            updateTaskStatus(id, status, outcome),

        onMutate: async ({ id, status }) => {
            await queryClient.cancelQueries({ queryKey: ["tasks"] });
            const previousQueries = queryClient.getQueriesData<{ items: Task[] }>({ queryKey: ["tasks"] });
            const previousStatus = previousQueries
                .flatMap(([, data]) => data?.items ?? [])
                .find((task) => task.id === id)?.status;
            applyTaskStatusOptimistically(queryClient, id, status);
            return { previousQueries, previousStatus };
        },

        onSuccess: (_task, { id, status }, context) => {
            const previousStatus = context?.previousStatus;
            if (!previousStatus || previousStatus === status) return;

            toastWithUndo({
                title: t("toasts.statusSuccess", { status: t(TASK_STATUS_LABEL_KEYS[status]) }),
                undo: () => updateTaskStatus(id, previousStatus),
                onUndone: invalidate,
            });
        },

        onError: (_err, _vars, context) => {
            context?.previousQueries?.forEach(([key, data]) => queryClient.setQueryData(key, data));
            toast.error({ title: t("toasts.statusError") });
        },

        onSettled: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
    });

    const remove = useMutation({
        mutationFn: (id: string) => deleteTask(id),
        onSuccess: async (_data, id) => {
            await invalidate();
            toastWithUndo({ title: t("toasts.deleteSuccess"), undo: () => restoreTask(id), onUndone: invalidate });
        },
        onError: () => toast.error({ title: t("toasts.deleteError") }),
    });

    return { create, update, changeStatus, remove };
}