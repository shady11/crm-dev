import {Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle} from "@/components/ui/sheet.tsx";
import {TaskForm} from "@/features/tasks/components/task-form.tsx";
import type {Task, TaskPayload} from "@/features/tasks/api/tasks.api.ts";

interface TaskFormSheetProps {
    open: boolean;
    task: Task | null;
    isSubmitting: boolean;
    hasError: boolean;
    onClose(): void;
    onSubmit(payload: TaskPayload): void;
}

export function TaskFormSheet({ open, task, isSubmitting, hasError, onClose, onSubmit }: TaskFormSheetProps) {
    return (
        <Sheet onOpenChange={({ open: isOpen }) => !isOpen && onClose()} open={open}>
            <SheetContent variant="inset" className="sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>{task ? "Edit task" : "Add task"}</SheetTitle>
                    <SheetDescription>{task ? "Update the task details." : "Create a new task."}</SheetDescription>
                </SheetHeader>
                <TaskForm
                    key={`${task?.id ?? "create-task"}-${open ? "open" : "closed"}`}
                    task={task}
                    errorMessage={hasError ? "Task could not be saved. Check the details and try again." : undefined}
                    isSubmitting={isSubmitting}
                    submitLabel={task ? "Save changes" : "Create task"}
                    onCancel={onClose}
                    onSubmit={onSubmit}
                />
            </SheetContent>
        </Sheet>
    );
}