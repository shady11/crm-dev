import {CalendarIcon, ClipboardListIcon} from "lucide-react";
import {Badge} from "@/components/ui/badge.tsx";
import {Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/components/ui/empty.tsx";
import {Spinner} from "@/components/ui/spinner.tsx";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {TASK_STATUS_CLASSES, TASK_STATUS_LABEL_KEYS} from "@/features/tasks/types/task.types.ts";
import type {Task} from "@/features/tasks/api/tasks.api.ts";
import {useTranslation} from "react-i18next";

interface TasksTableProps {
    tasks: Task[];
    isLoading: boolean;
    onRowClick(task: Task): void;
}

function isOverdue(task: Task) {
    return !!task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE" && task.status !== "CANCELLED";
}

export function TasksTable({ tasks, isLoading, onRowClick }: TasksTableProps) {
    const { t, i18n } = useTranslation("tasks");

    if (isLoading) {
        return <div className="flex h-64 items-center justify-center rounded-lg border border-secondary"><Spinner className="size-6" /></div>;
    }

    if (tasks.length === 0) {
        return (
            <Empty>
                <EmptyHeader>
                    <EmptyMedia variant="icon"><ClipboardListIcon strokeWidth={1.25} /></EmptyMedia>
                    <EmptyTitle>{t("table.emptyTitle")}</EmptyTitle>
                    <EmptyDescription>{t("table.emptyDescription")}</EmptyDescription>
                </EmptyHeader>
            </Empty>
        );
    }

    return (
        <div className="rounded-lg border border-secondary">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t("table.title")}</TableHead>
                        <TableHead>{t("table.relatedTo")}</TableHead>
                        <TableHead>{t("table.assignee")}</TableHead>
                        <TableHead>{t("table.dueDate")}</TableHead>
                        <TableHead>{t("table.status")}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {tasks.map((task) => (
                        <TableRow key={task.id} className="cursor-pointer" onClick={() => onRowClick(task)}>
                            <TableCell className="font-medium">{task.title}</TableCell>
                            <TableCell className="text-muted-foreground">
                                {task.deal ? t("related.deal", { number: task.deal.dealNumber }) : task.client ? task.client.fullName : task.lead ? task.lead.fullName : "—"}
                            </TableCell>
                            <TableCell>{task.assignedTo.fullName}</TableCell>
                            <TableCell>
                                {task.dueDate ? (
                                    <span className={`flex items-center gap-1.5 ${isOverdue(task) ? "font-medium text-destructive" : ""}`}>
                                        <CalendarIcon size={14} />
                                        {new Date(task.dueDate).toLocaleDateString(i18n.language)}
                                    </span>
                                ) : "—"}
                            </TableCell>
                            <TableCell>
                                <Badge className={`${TASK_STATUS_CLASSES[task.status]} text-white`}>
                                    {t(TASK_STATUS_LABEL_KEYS[task.status])}
                                </Badge>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}