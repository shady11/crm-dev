import {TaskStatus} from "@/features/tasks/types/task.types.ts";
import {TaskStatusCard} from "./task-status-card.tsx";

export function TaskStatusCardsGrid({ countsByStatus }: { countsByStatus: Map<TaskStatus, number> }) {
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Object.values(TaskStatus).map((status) => (
                <TaskStatusCard key={status} status={status} count={countsByStatus.get(status) ?? 0} />
            ))}
        </div>
    );
}