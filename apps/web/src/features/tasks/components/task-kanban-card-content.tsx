import {CalendarIcon, User} from "lucide-react";
import {CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import type {Task} from "@/features/tasks/api/tasks.api.ts";
import {Separator} from "@/components/ui/separator.tsx";
import {formatDate} from "@/utils/date-formatter.ts";
import {Badge} from "@/components/ui/badge.tsx";
import {useTranslation} from "react-i18next";

function isOverdue(task: Task) {
    return !!task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE" && task.status !== "CANCELLED";
}

export function TaskKanbanCardContent({ task }: { task: Task }) {
    const { t, i18n } = useTranslation("tasks");
    const related = task.deal ? t("related.deal", { number: task.deal.dealNumber }) : task.client?.fullName ?? task.lead?.fullName;

    return (
        <>
            <CardHeader className="px-4">
                {related &&
                    <div className="flex items-center gap-1 mb-1">
                        <Badge variant="secondary" size="xs">
                            {related}
                        </Badge>
                    </div>
                }
                <CardTitle>{task.title}</CardTitle>
                <CardDescription className="row-start-auto text-xs">
                    {task.description}
                </CardDescription>
            </CardHeader>
            <CardContent className="px-4">
                <Separator />
                <div className="flex items-center justify-between gap-2 pt-3 text-xs text-muted-foreground">
                    <span className="flex shrink-0 items-center gap-1 truncate">
                        <User size={15}/>
                        {task.assignedTo.fullName}
                    </span>
                    {task.dueDate && (
                        <span className={`flex shrink-0 items-center gap-1 ${isOverdue(task) ? "font-medium text-destructive" : ""}`}>
                            <CalendarIcon size={15}/>
                            {formatDate(task.dueDate, i18n.language).date}
                        </span>
                    )}
                </div>
            </CardContent>
        </>
    );
}