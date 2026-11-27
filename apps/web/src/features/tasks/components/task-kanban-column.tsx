import {memo} from "react";
import {useDroppable} from "@dnd-kit/core";
import {cn} from "@/lib/utils";
import {TASK_STATUS_CLASSES, TASK_STATUS_LABEL_KEYS, type TaskStatus} from "@/features/tasks/types/task.types.ts";
import {TaskKanbanCard} from "./task-kanban-card.tsx";
import type {Task} from "@/features/tasks/api/tasks.api.ts";
import {useTranslation} from "react-i18next";
import {ScrollArea} from "@/components/ui/scroll-area";

interface TaskKanbanColumnProps {
    status: TaskStatus;
    tasks: Task[];
    /** Status of the card being dragged, or null when nothing is dragged. */
    sourceStatus: TaskStatus | null;
    canMoveTask(task: Task): boolean;
    onCardClick(task: Task): void;
}

export const TaskKanbanColumn = memo(function TaskKanbanColumn({ status, tasks, sourceStatus, canMoveTask, onCardClick }: TaskKanbanColumnProps) {
    const { t } = useTranslation("tasks");
    const { setNodeRef, isOver } = useDroppable({ id: status });
    // Hovering the column the card came from changes nothing, so don't
    // highlight it as a drop target.
    const isDropTarget = isOver && sourceStatus !== null && sourceStatus !== status;

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "flex w-72 shrink-0 flex-col gap-3 rounded-lg border border-secondary bg-secondary/20 p-3 transition-colors duration-150",
                isDropTarget && "border-primary bg-primary/5",
            )}
        >
            <div className="flex items-center gap-2 px-1">
                <span className={`size-2 rounded-full ${TASK_STATUS_CLASSES[status]}`} />
                <h3 className="text-sm font-medium">{t(TASK_STATUS_LABEL_KEYS[status])}</h3>
                <span className="ml-auto text-xs text-muted-foreground">{tasks.length}</span>
            </div>

            <ScrollArea
                className="max-h-[calc(100vh-320px)] [&>[data-slot=scroll-area-viewport]]:max-h-[inherit]"
            >
                <div className="flex flex-col gap-2 pr-2">
                    {tasks.length === 0 ? (
                        <p className="py-6 text-center text-xs text-muted-foreground">{t("kanban.noTasks")}</p>
                    ) : (
                        tasks.map((task) => <TaskKanbanCard key={task.id} task={task} canMove={canMoveTask(task)} onClick={onCardClick} />)
                    )}
                </div>
            </ScrollArea>
        </div>
    );
});
