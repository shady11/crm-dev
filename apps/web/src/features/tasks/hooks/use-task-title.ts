import {useCallback} from "react";
import {useTranslation} from "react-i18next";

export type TaskTitleSource = {
    title: string;
    templateKey?: string | null;
    templateParams?: Record<string, unknown> | null;
};

/**
 * E2E-9: a task's title in the reader's language. Tasks the system makes
 * ("Call …", "Confirm documents for deal …") carry a template key and values
 * next to their English title; anything else, or a key this build doesn't
 * know, shows the stored title.
 */
export function useTaskTitle() {
    const {t, i18n} = useTranslation("tasks");
    return useCallback(
        (task: TaskTitleSource) => {
            if (!task.templateKey) return task.title;
            const key = `tasks:autoTitles.${task.templateKey}`;
            const values = task.templateParams ?? {};
            return i18n.exists(key, values) ? t(key, values) : task.title;
        },
        [t, i18n],
    );
}

/**
 * The same, for a notification or activity that names a task: its values
 * carry the task's own template next to the English title.
 */
export function useTaskTitleFromValues() {
    const taskTitle = useTaskTitle();
    return useCallback(
        (values: Record<string, unknown>, field: "taskTitle" | "task") => {
            const templateKey = values.taskTemplateKey;
            if (typeof templateKey !== "string" || typeof values[field] !== "string") return;
            values[field] = taskTitle({
                title: values[field] as string,
                templateKey,
                templateParams: (values.taskTemplateParams as Record<string, unknown>) ?? null,
            });
        },
        [taskTitle],
    );
}
