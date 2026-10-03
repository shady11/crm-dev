import {useDraggable} from "@dnd-kit/core";
import {Card} from "@/components/ui/card.tsx";
import {TaskKanbanCardContent} from "./task-kanban-card-content.tsx";
import type {Task} from "@/features/tasks/api/tasks.api.ts";
import {cn} from "@/lib/utils";

interface TaskKanbanCardProps {
    task: Task;
    canMove: boolean;
    onClick(task: Task): void;
}

export function TaskKanbanCard({ task, canMove, onClick }: TaskKanbanCardProps) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id, disabled: !canMove });

    return (
        <Card
            ref={setNodeRef}
            // A disabled draggable still reports aria-disabled, but the card
            // stays clickable to open its details — so only wire up drag
            // when the user may actually move it.
            {...(canMove ? { ...listeners, ...attributes } : {})}
            onClick={() => onClick(task)}
            className={cn(
                "py-4 gap-3 border border-secondary shadow-none",
                canMove ? "cursor-grab touch-none active:cursor-grabbing" : "cursor-pointer",
                isDragging ? "opacity-0" : "opacity-100",
            )}
        >
            <TaskKanbanCardContent task={task} />
        </Card>
    );
}