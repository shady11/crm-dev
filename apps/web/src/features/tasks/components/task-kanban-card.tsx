import {useDraggable} from "@dnd-kit/core";
import {Card} from "@/components/ui/card.tsx";
import {TaskKanbanCardContent} from "./task-kanban-card-content.tsx";
import type {Task} from "@/features/tasks/api/tasks.api.ts";

interface TaskKanbanCardProps {
    task: Task;
    onClick(task: Task): void;
}

export function TaskKanbanCard({ task, onClick }: TaskKanbanCardProps) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });

    return (
        <Card
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            onClick={() => onClick(task)}
            className={`py-4 gap-3 cursor-grab touch-none border border-secondary shadow-none active:cursor-grabbing ${
                isDragging ? "opacity-0" : "opacity-100"
            }`}
        >
            <TaskKanbanCardContent task={task} />
        </Card>
    );
}