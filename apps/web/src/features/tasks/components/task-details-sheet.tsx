import {Pen} from "lucide-react";
import {Button} from "@/components/ui/button.tsx";
import {Badge} from "@/components/ui/badge.tsx";
import {DataList, DataListItem, DataListItemLabel, DataListItemValue} from "@/components/ui/data-list.tsx";
import {Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle} from "@/components/ui/sheet.tsx";
import type {Task} from "@/features/tasks/api/tasks.api.ts";
import {
    TASK_PRIORITY_CLASSES,
    TASK_PRIORITY_LABEL_KEYS,
    TASK_STATUS_CLASSES,
    TASK_STATUS_LABEL_KEYS,
    TASK_TYPE_LABEL_KEYS,
} from "@/features/tasks/types/task.types.ts";
import {canEditTask} from "@/features/tasks/utils/task-access.ts";
import {useAuth} from "@/features/auth/hooks/use-auth.ts";
import {formatDate} from "@/utils/date-formatter.ts";
import {useTranslation} from "react-i18next";

interface TaskDetailsSheetProps {
    task: Task | null;
    open: boolean;
    onOpenChange(open: boolean): void;
    onEdit(task: Task): void;
}

export function TaskDetailsSheet({ task, open, onOpenChange, onEdit }: TaskDetailsSheetProps) {
    const { t, i18n } = useTranslation("tasks");
    const { user } = useAuth();

    if (!task) {
        return null;
    }

    const related = task.deal
        ? t("related.deal", { number: task.deal.dealNumber })
        : task.client?.fullName ?? task.lead?.fullName;
    const created = formatDate(task.createdAt, i18n.language);

    return (
        <Sheet open={open} onOpenChange={({ open: isOpen }) => onOpenChange(isOpen)}>
            <SheetContent className="sm:max-w-md" variant="inset">
                <SheetHeader>
                    <SheetTitle>{task.title}</SheetTitle>
                </SheetHeader>

                <SheetBody scrollFade>
                    <div className="space-y-4 py-4">
                        <div className="rounded-lg border border-secondary px-4 py-2">
                            <DataList className="divide-y">
                                <DataListItem>
                                    <DataListItemLabel>{t("details.status")}</DataListItemLabel>
                                    <DataListItemValue>
                                        <Badge className={`${TASK_STATUS_CLASSES[task.status]} text-white`}>
                                            {t(TASK_STATUS_LABEL_KEYS[task.status])}
                                        </Badge>
                                    </DataListItemValue>
                                </DataListItem>
                                <DataListItem>
                                    <DataListItemLabel>{t("details.priority")}</DataListItemLabel>
                                    <DataListItemValue>
                                        <Badge className={`${TASK_PRIORITY_CLASSES[task.priority]} text-white`}>
                                            {t(TASK_PRIORITY_LABEL_KEYS[task.priority])}
                                        </Badge>
                                    </DataListItemValue>
                                </DataListItem>
                                <DataListItem>
                                    <DataListItemLabel>{t("details.type")}</DataListItemLabel>
                                    <DataListItemValue>{t(TASK_TYPE_LABEL_KEYS[task.type])}</DataListItemValue>
                                </DataListItem>
                                <DataListItem>
                                    <DataListItemLabel>{t("details.assignee")}</DataListItemLabel>
                                    <DataListItemValue>{task.assignedTo.fullName}</DataListItemValue>
                                </DataListItem>
                                <DataListItem>
                                    <DataListItemLabel>{t("details.relatedTo")}</DataListItemLabel>
                                    <DataListItemValue>{related ?? "—"}</DataListItemValue>
                                </DataListItem>
                                <DataListItem>
                                    <DataListItemLabel>{t("details.dueDate")}</DataListItemLabel>
                                    <DataListItemValue>
                                        {task.dueDate ? formatDate(task.dueDate, i18n.language).date : "—"}
                                    </DataListItemValue>
                                </DataListItem>
                                <DataListItem>
                                    <DataListItemLabel>{t("details.created")}</DataListItemLabel>
                                    <DataListItemValue>{`${created.date}, ${created.time}`}</DataListItemValue>
                                </DataListItem>
                            </DataList>
                        </div>

                        <div className="space-y-1.5">
                            <p className="text-sm font-medium">{t("details.description")}</p>
                            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{task.description || "—"}</p>
                        </div>

                        {task.outcome && (
                            <div className="space-y-1.5">
                                <p className="text-sm font-medium">{t("details.outcome")}</p>
                                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{task.outcome}</p>
                            </div>
                        )}
                    </div>
                </SheetBody>

                {canEditTask(user) && (
                    <SheetFooter>
                        <Button variant="secondary" className="flex-1" onClick={() => onEdit(task)}>
                            <Pen className="size-4" />
                            {t("details.edit")}
                        </Button>
                    </SheetFooter>
                )}
            </SheetContent>
        </Sheet>
    );
}
