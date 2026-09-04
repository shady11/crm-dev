import {Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle} from "@/components/ui/sheet.tsx";
import {TaskForm} from "@/features/tasks/components/task-form.tsx";
import type {Task, TaskPayload} from "@/features/tasks/api/tasks.api.ts";
import {useTranslation} from "react-i18next";

interface TaskFormSheetProps {
    open: boolean;
    task: Task | null;
    isSubmitting: boolean;
    hasError: boolean;
    onClose(): void;
    onSubmit(payload: TaskPayload): void;
}

export function TaskFormSheet({ open, task, isSubmitting, hasError, onClose, onSubmit }: TaskFormSheetProps) {
    const { t } = useTranslation("tasks");

    return (
        <Sheet onOpenChange={({ open: isOpen }) => !isOpen && onClose()} open={open}>
            <SheetContent variant="inset" className="sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>{task ? t("form.editTitle") : t("form.addTitle")}</SheetTitle>
                    <SheetDescription>{task ? t("form.editDescription") : t("form.addDescription")}</SheetDescription>
                </SheetHeader>
                <TaskForm
                    key={`${task?.id ?? "create-task"}-${open ? "open" : "closed"}`}
                    task={task}
                    errorMessage={hasError ? t("form.saveError") : undefined}
                    isSubmitting={isSubmitting}
                    submitLabel={task ? t("form.saveChanges") : t("form.create")}
                    onCancel={onClose}
                    onSubmit={onSubmit}
                />
            </SheetContent>
        </Sheet>
    );
}