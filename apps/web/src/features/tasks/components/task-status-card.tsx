import {CheckCircle2Icon, CircleIcon, ClockIcon, XCircleIcon} from "lucide-react";
import {Card, CardContent} from "@/components/ui/card.tsx";
import {TASK_STATUS_CLASSES, TASK_STATUS_LABEL_KEYS, type TaskStatus} from "@/features/tasks/types/task.types.ts";
import {useTranslation} from "react-i18next";

const ICONS: Record<TaskStatus, typeof CircleIcon> = {
    TODO: CircleIcon,
    IN_PROGRESS: ClockIcon,
    DONE: CheckCircle2Icon,
    CANCELLED: XCircleIcon,
};

export function TaskStatusCard({ status, count }: { status: TaskStatus; count: number }) {
    const { t } = useTranslation("tasks");

    const Icon = ICONS[status];

    return (
        <Card className="border border-secondary shadow-none">
            <CardContent className="flex items-center gap-3">
                <div className={`rounded-lg p-2 text-white ${TASK_STATUS_CLASSES[status]}`}>
                    <Icon size={20} strokeWidth={1.75} />
                </div>
                <div>
                    <h3 className="font-medium">{t(TASK_STATUS_LABEL_KEYS[status])}</h3>
                    <p className="text-sm text-muted-foreground">{count} task{count !== 1 ? "s" : ""}</p>
                </div>
            </CardContent>
        </Card>
    );
}