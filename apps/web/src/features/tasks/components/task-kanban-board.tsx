import {useCallback, useMemo, useState} from "react";
import {createPortal} from "react-dom";
import {
    type CollisionDetection,
    DndContext,
    type DragEndEvent,
    DragOverlay,
    type DragStartEvent,
    MeasuringStrategy,
    PointerSensor,
    TouchSensor,
    pointerWithin,
    rectIntersection,
    useSensor,
    useSensors
} from "@dnd-kit/core";
import {Card} from "@/components/ui/card.tsx";
import {Spinner} from "@/components/ui/spinner.tsx";
import {TaskStatus} from "@/features/tasks/types/task.types.ts";
import {TaskKanbanColumn} from "./task-kanban-column.tsx";
import {TaskKanbanCardContent} from "./task-kanban-card-content.tsx";
import {TASK_KANBAN_CARD_CLASS} from "./task-kanban-card.tsx";
import {useTasksBoard} from "@/features/tasks/hooks/use-tasks-board.ts";
import type {Task} from "@/features/tasks/api/tasks.api.ts";
import {useQueryClient} from "@tanstack/react-query";
import {applyTaskStatusOptimistically} from "@/features/tasks/utils/optimistic-status.ts";
import {canMoveTask} from "@/features/tasks/utils/task-access.ts";
import {useAuth} from "@/features/auth/hooks/use-auth.ts";
import {cn} from "@/lib/utils";

interface TaskKanbanBoardProps {
    search?: string;
    assignedToId?: string;
    branchId?: string;
    onStatusChange(taskId: string, status: TaskStatus): void;
    onCardClick(task: Task): void;
}

// The column under the pointer wins; when the pointer is in the gap between
// columns, fall back to whichever column the dragged card overlaps most.
const collisionDetection: CollisionDetection = (args) => {
    const hits = pointerWithin(args);
    return hits.length > 0 ? hits : rectIntersection(args);
};

// Columns don't move or resize during a drag, so measure them once up front
// instead of on every pointer move.
const measuring = { droppable: { strategy: MeasuringStrategy.BeforeDragging } };

interface ActiveDrag {
    task: Task;
    width: number;
}

export function TaskKanbanBoard({ search, assignedToId, branchId, onStatusChange, onCardClick }: TaskKanbanBoardProps) {
    const { tasksByStatus, isLoading } = useTasksBoard({ search, assignedToId, branchId });
    const [active, setActive] = useState<ActiveDrag | null>(null);
    // Set when a drop moved the card to another column: the overlay then just
    // fades out where it was released, because the card already re-rendered in
    // its new column. A cancelled drop keeps the default glide back home.
    const [movedOnDrop, setMovedOnDrop] = useState(false);
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const isMovable = useCallback((task: Task) => canMoveTask(user, task), [user]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    );

    const tasksById = useMemo(() => {
        const map = new Map<string, Task>();
        for (const tasks of tasksByStatus.values()) for (const task of tasks) map.set(task.id, task);
        return map;
    }, [tasksByStatus]);

    const handleDragStart = (event: DragStartEvent) => {
        const task = tasksById.get(String(event.active.id));
        if (!task) return;
        setMovedOnDrop(false);
        setActive({ task, width: event.active.rect.current.initial?.width ?? 0 });
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { over } = event;
        const task = active?.task;
        const newStatus = over?.id as TaskStatus | undefined;

        if (task && newStatus && task.status !== newStatus && isMovable(task)) {
            setMovedOnDrop(true);
            applyTaskStatusOptimistically(queryClient, task.id, newStatus);
            onStatusChange(task.id, newStatus);
        }

        setActive(null);
    };

    if (isLoading) {
        return <div className="flex h-64 items-center justify-center"><Spinner className="size-6" /></div>;
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            measuring={measuring}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActive(null)}
        >
            <div className="flex gap-4 overflow-x-auto pb-2">
                {Object.values(TaskStatus).map((status) => (
                    <TaskKanbanColumn
                        key={status}
                        status={status}
                        tasks={tasksByStatus.get(status) ?? []}
                        sourceStatus={active?.task.status ?? null}
                        canMoveTask={isMovable}
                        onCardClick={onCardClick}
                    />
                ))}
            </div>

            {/* Portalled to <body>: the app's glass panel has a backdrop-filter,
                which makes it the containing block for position:fixed and
                would offset the overlay from the pointer. */}
            {createPortal(
                <DragOverlay
                    dropAnimation={movedOnDrop
                        ? { duration: 150, keyframes: () => [{ opacity: 1 }, { opacity: 0 }], sideEffects: null }
                        : { duration: 200, easing: "cubic-bezier(0.2, 0, 0, 1)" }}
                >
                    {active && (
                        <Card
                            style={{ width: active.width || undefined }}
                            className={cn(
                                TASK_KANBAN_CARD_CLASS,
                                "cursor-grabbing border-primary bg-background shadow-xl rotate-2 scale-[1.02]",
                            )}
                        >
                            <TaskKanbanCardContent task={active.task} />
                        </Card>
                    )}
                </DragOverlay>,
                document.body,
            )}
        </DndContext>
    );
}
