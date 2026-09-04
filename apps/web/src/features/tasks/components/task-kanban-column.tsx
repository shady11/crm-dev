import {useDroppable} from "@dnd-kit/core";
import {cn} from "@/lib/utils";
import {TASK_STATUS_CLASSES, TASK_STATUS_LABEL_KEYS, type TaskStatus} from "@/features/tasks/types/task.types.ts";
import {TaskKanbanCard} from "./task-kanban-card.tsx";
import type {Task} from "@/features/tasks/api/tasks.api.ts";
import {useTranslation} from "react-i18next";

interface TaskKanbanColumnProps {
    status: TaskStatus;
    tasks: Task[];
    onCardClick(task: Task): void;
}

export function TaskKanbanColumn({ status, tasks, onCardClick }: TaskKanbanColumnProps) {
    const { t } = useTranslation("tasks");
    const { setNodeRef, isOver } = useDroppable({ id: status });

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "flex w-72 shrink-0 flex-col gap-3 rounded-lg border border-secondary bg-secondary/20 p-3 transition-colors",
                isOver && "border-primary bg-primary/5",
            )}
        >
            <div className="flex items-center gap-2 px-1">
                <span className={`size-2 rounded-full ${TASK_STATUS_CLASSES[status]}`} />
                <h3 className="text-sm font-medium">{t(TASK_STATUS_LABEL_KEYS[status])}</h3>
                <span className="ml-auto text-xs text-muted-foreground">{tasks.length}</span>
            </div>

            <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: "calc(100vh - 320px)" }}>
                {tasks.length === 0 ? (
                    <p className="py-6 text-center text-xs text-muted-foreground">{t("kanban.noTasks")}</p>
                ) : (
                    tasks.map((task) => <TaskKanbanCard key={task.id} task={task} onClick={onCardClick} />)
                )}
            </div>
        </div>
    );
}