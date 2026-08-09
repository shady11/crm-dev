import {useState} from "react";
import {
    DndContext,
    type DragEndEvent,
    DragOverlay,
    type DragStartEvent,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors
} from "@dnd-kit/core";
import {Card} from "@/components/ui/card.tsx";
import {Spinner} from "@/components/ui/spinner.tsx";
import {TaskStatus} from "@/features/tasks/types/task.types.ts";
import {TaskKanbanColumn} from "./task-kanban-column.tsx";
import {TaskKanbanCardContent} from "./task-kanban-card-content.tsx";
import {useTasksBoard} from "@/features/tasks/hooks/use-tasks-board.ts";
import type {Task} from "@/features/tasks/api/tasks.api.ts";
import {useQueryClient} from "@tanstack/react-query";
import {applyTaskStatusOptimistically} from "@/features/tasks/utils/optimistic-status.ts";

interface TaskKanbanBoardProps {
    search?: string;
    assignedToId?: string;
    onStatusChange(taskId: string, status: TaskStatus): void;
    onCardClick(task: Task): void;
}

export function TaskKanbanBoard({ search, assignedToId, onStatusChange, onCardClick }: TaskKanbanBoardProps) {
    const { tasksByStatus, isLoading } = useTasksBoard({ search, assignedToId });
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const queryClient = useQueryClient();

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    );

    const allTasks = Array.from(tasksByStatus.values()).flat();

    const handleDragStart = (event: DragStartEvent) => {
        setActiveTask(allTasks.find((t) => t.id === event.active.id) ?? null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        const task = allTasks.find((t) => t.id === active.id);

        if (over && task) {
            const newStatus = over.id as TaskStatus;
            if (task.status !== newStatus) {
                applyTaskStatusOptimistically(queryClient, task.id, newStatus);
                onStatusChange(task.id, newStatus);
            }
        }

        setActiveTask(null);
    };

    if (isLoading) {
        return <div className="flex h-64 items-center justify-center"><Spinner className="size-6" /></div>;
    }

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-2">
                {Object.values(TaskStatus).map((status) => (
                    <TaskKanbanColumn key={status} status={status} tasks={tasksByStatus.get(status) ?? []} onCardClick={onCardClick} />
                ))}
            </div>

            <DragOverlay>
                {activeTask && (
                    <Card className="w-72 border border-primary shadow-lg">
                        <TaskKanbanCardContent task={activeTask} />
                    </Card>
                )}
            </DragOverlay>
        </DndContext>
    );
}