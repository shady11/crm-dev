import {CalendarIcon, ClipboardListIcon} from "lucide-react";
import {Badge} from "@/components/ui/badge.tsx";
import {TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {DataTable} from "@/components/shared/data-table.tsx";
import {SortableTableHead} from "@/components/shared/sortable-table-head.tsx";
import {TASK_STATUS_CLASSES, TASK_STATUS_LABEL_KEYS} from "@/features/tasks/types/task.types.ts";
import type {Task, TaskSortField} from "@/features/tasks/api/tasks.api.ts";
import {useTranslation} from "react-i18next";
import type {SortOrder} from "@/hooks/use-sort.ts";

interface TasksTableProps {
    tasks: Task[];
    isLoading: boolean;
    sortBy: TaskSortField | undefined;
    sortOrder: SortOrder | undefined;
    onSort(field: TaskSortField): void;
    onRowClick(task: Task): void;
}

function isOverdue(task: Task) {
    return !!task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE" && task.status !== "CANCELLED";
}

export function TasksTable({ tasks, isLoading, sortBy, sortOrder, onSort, onRowClick }: TasksTableProps) {
    const { t, i18n } = useTranslation("tasks");

    return (
        <DataTable
            isLoading={isLoading}
            isEmpty={tasks.length === 0}
            emptyIcon={<ClipboardListIcon strokeWidth={1.25} />}
            emptyTitle={t("table.emptyTitle")}
            emptyDescription={t("table.emptyDescription")}
            cards={tasks.map((task) => (
                <div
                    key={task.id}
                    className="cursor-pointer rounded-lg border border-secondary p-4"
                    onClick={() => onRowClick(task)}
                >
                    <div className="flex items-start justify-between gap-3">
                        <p className="font-medium">{task.title}</p>
                        <Badge className={`${TASK_STATUS_CLASSES[task.status]} text-white`}>
                            {t(TASK_STATUS_LABEL_KEYS[task.status])}
                        </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {task.deal ? t("related.deal", { number: task.deal.dealNumber }) : task.client ? task.client.fullName : task.lead ? task.lead.fullName : "—"}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                        <span>{task.assignedTo.fullName}</span>
                        {task.dueDate ? (
                            <span className={`flex items-center gap-1.5 ${isOverdue(task) ? "font-medium text-destructive" : ""}`}>
                                <CalendarIcon size={14} />
                                {new Date(task.dueDate).toLocaleDateString(i18n.language)}
                            </span>
                        ) : "—"}
                    </div>
                </div>
            ))}
        >
            <TableHeader>
                <TableRow>
                    <SortableTableHead field="title" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
                        {t("table.title")}
                    </SortableTableHead>
                    <TableHead>{t("table.relatedTo")}</TableHead>
                    <TableHead>{t("table.assignee")}</TableHead>
                    <SortableTableHead field="dueDate" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
                        {t("table.dueDate")}
                    </SortableTableHead>
                    <SortableTableHead field="status" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
                        {t("table.status")}
                    </SortableTableHead>
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
        </DataTable>
    );
}