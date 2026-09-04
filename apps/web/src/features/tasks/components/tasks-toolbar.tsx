import {PlusIcon, Search} from "lucide-react";
import {createListCollection} from "@ark-ui/react";
import {InputGroup, InputGroupAddon, InputGroupInput} from "@/components/ui/input-group.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {Button} from "@/components/ui/button.tsx";
import {TASK_STATUS_LABEL_KEYS, TaskStatus} from "@/features/tasks/types/task.types.ts";
import type {TaskStatusFilter} from "@/features/tasks/hooks/use-tasks-list.ts";
import {useAssignableUsers} from "@/features/users/hooks/use-assignable-users.ts";
import {useTranslation} from "react-i18next";

interface TasksToolbarProps {
    statusFilter: TaskStatusFilter;
    onStatusFilterChange(value: TaskStatusFilter): void;
    assignedToId?: string;
    onAssignedToIdChange(value: string | undefined): void;
    search: string;
    onSearchChange(value: string): void;
    onAddTask(): void;
    hideStatusFilter?: boolean;
}

export function TasksToolbar({ statusFilter, onStatusFilterChange, assignedToId, onAssignedToIdChange, search, onSearchChange, onAddTask, hideStatusFilter }: TasksToolbarProps) {
    const { t } = useTranslation("tasks");

    const assignableUsers = useAssignableUsers();
    const assigneeCollection = createListCollection({
        items: [{ label: t("toolbar.everyone"), value: "all" }, ...assignableUsers.data.map((u) => ({ label: u.fullName, value: u.id }))],
    });

    const statusCollection = createListCollection({
        items: [
            { label: t("toolbar.allStatuses"), value: "all" },
            ...Object.values(TaskStatus).map(
                (s) => ({
                    label: t(TASK_STATUS_LABEL_KEYS[s]),
                    value: s
                })
            )
        ],
    });

    return (
        <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-medium">{t("toolbar.heading")}</h2>

            <div className="flex flex-wrap items-center gap-2">
                <Select collection={assigneeCollection} value={[assignedToId ?? "all"]} onValueChange={({ value }) => onAssignedToIdChange(value[0] === "all" ? undefined : value[0])}>
                    <SelectTrigger className="w-44"><SelectValue placeholder={t("toolbar.assigneePlaceholder")} /></SelectTrigger>
                    <SelectContent>
                        {assigneeCollection.items.map((item) => <SelectItem key={item.value} item={item}>{item.label}</SelectItem>)}
                    </SelectContent>
                </Select>

                {!hideStatusFilter && (
                    <Select collection={statusCollection} value={[statusFilter]} onValueChange={({ value }) => onStatusFilterChange((value[0] ?? "all") as TaskStatusFilter)}>
                        <SelectTrigger className="w-48"><SelectValue placeholder={t("toolbar.filterByStatus")} /></SelectTrigger>
                        <SelectContent>
                            {statusCollection.items.map((item) => <SelectItem key={item.value} item={item}>{item.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                )}

                <InputGroup className="w-64">
                    <InputGroupInput placeholder={t("toolbar.searchPlaceholder")} value={search} onChange={(e) => onSearchChange(e.target.value)} />
                    <InputGroupAddon><Search className="size-4" /></InputGroupAddon>
                </InputGroup>

                <Button onClick={onAddTask}>
                    <PlusIcon className="size-4" />
                    {t("toolbar.addTask")}
                </Button>
            </div>
        </div>
    );
}