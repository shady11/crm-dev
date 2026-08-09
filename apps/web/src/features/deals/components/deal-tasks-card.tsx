import {useState} from "react";
import {CheckCircle2Icon, CircleIcon, ClockIcon, XCircleIcon} from "lucide-react";
import {Badge} from "@/components/ui/badge.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {TaskFormSheet} from "@/features/tasks/components/task-form-sheet.tsx";
import {useDealTasks} from "@/features/tasks/hooks/use-deal-tasks.ts";
import {useTaskActions} from "@/features/tasks/hooks/use-task-actions.ts";
import {TASK_STATUS_CLASSES, TASK_STATUS_LABELS} from "@/features/tasks/types/task.types.ts";
import type {Task, TaskPayload} from "@/features/tasks/api/tasks.api.ts";
import {formatDate} from "@/utils/date-formatter.ts";

const ICONS: Record<string, typeof CircleIcon> = {
    TODO: CircleIcon,
    IN_PROGRESS: ClockIcon,
    DONE: CheckCircle2Icon,
    CANCELLED: XCircleIcon,
};

export function DealTasksCard({ dealId }: { dealId: string }) {
    const { tasks, isLoading } = useDealTasks(dealId);
    const actions = useTaskActions();

    const [formOpen, setFormOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    const openCreate = () => { setEditingTask(null); setFormOpen(true); };
    const openEdit = (task: Task) => { setEditingTask(task); setFormOpen(true); };
    const closeForm = () => { setFormOpen(false); setEditingTask(null); actions.create.reset(); actions.update.reset(); };

    const handleSubmit = (payload: TaskPayload) => {
        if (editingTask) {
            actions.update.mutate({ id: editingTask.id, payload }, { onSuccess: closeForm });
            return;
        }
        // dealId прокидывается здесь, а не через форму — форма его не знает и не должна
        actions.create.mutate({ ...payload, dealId }, { onSuccess: closeForm });
    };

    return (
        <Card className="border border-secondary shadow-none pt-0">
            <CardHeader className="flex items-center justify-between border-b py-4">
                <CardTitle className="text-sm text-muted-foreground">
                    Tasks{tasks.length > 0 && ` (${tasks.length})`}
                </CardTitle>
                <Button variant="secondary" size="xs" onClick={openCreate}>
                    Add task
                </Button>
            </CardHeader>
            <CardContent>
                {isLoading ? null : tasks.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">No tasks linked to this deal.</p>
                ) : (
                    <div className="flex flex-col divide-y">
                        {tasks.map((task) => {
                            const Icon = ICONS[task.status] ?? CircleIcon;
                            return (
                                <div
                                    key={task.id}
                                    className="flex cursor-pointer items-center gap-3 py-2.5 text-sm"
                                    onClick={() => openEdit(task)}
                                >
                                    <Icon size={16} className="shrink-0 text-muted-foreground" />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium">{task.title}</p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {task.assignedTo.fullName}
                                            {task.dueDate && ` · ${formatDate(task.dueDate).date}`}
                                        </p>
                                    </div>
                                    <Badge className={`${TASK_STATUS_CLASSES[task.status]} shrink-0 text-white`}>
                                        {TASK_STATUS_LABELS[task.status]}
                                    </Badge>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>

            <TaskFormSheet
                open={formOpen}
                task={editingTask}
                isSubmitting={actions.create.isPending || actions.update.isPending}
                hasError={actions.create.isError || actions.update.isError}
                onClose={closeForm}
                onSubmit={handleSubmit}
            />
        </Card>
    );
}