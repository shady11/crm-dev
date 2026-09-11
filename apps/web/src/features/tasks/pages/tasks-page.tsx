import {useState} from "react";
import {LayoutGridIcon, ListIcon} from "lucide-react";
import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle-group.tsx";
import {TaskStatusCardsGrid} from "@/features/tasks/components/task-status-cards-grid.tsx";
import {TasksToolbar} from "@/features/tasks/components/tasks-toolbar.tsx";
import {TasksTable} from "@/features/tasks/components/tasks-table.tsx";
import {TasksPagination} from "@/features/tasks/components/tasks-pagination.tsx";
import {TaskKanbanBoard} from "@/features/tasks/components/task-kanban-board.tsx";
import {TaskFormSheet} from "@/features/tasks/components/task-form-sheet.tsx";
import {useTasksList} from "@/features/tasks/hooks/use-tasks-list.ts";
import {useTaskActions} from "@/features/tasks/hooks/use-task-actions.ts";
import type {Task, TaskPayload} from "@/features/tasks/api/tasks.api.ts";
import {useTranslation} from "react-i18next";

type TasksView = "table" | "board";

export function TasksPage() {
    const { t } = useTranslation("tasks");
    const { filters, pagination, table, statusSummary } = useTasksList();
    const actions = useTaskActions();

    const [view, setView] = useState<TasksView>("board");
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
        actions.create.mutate(payload, { onSuccess: closeForm });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <h2 className="text-2xl font-medium tracking-tight">{t("page.title")}</h2>

                <ToggleGroup
                    size="sm"
                    multiple={false}
                    value={[view]}
                    onValueChange={({ value }) => setView((value[0] as TasksView) ?? "board")}
                >
                    <ToggleGroupItem value="board" aria-label={t("kanban.boardView")}><LayoutGridIcon className="size-3.5" /></ToggleGroupItem>
                    <ToggleGroupItem value="table" aria-label={t("kanban.tableView")}><ListIcon className="size-3.5" /></ToggleGroupItem>
                </ToggleGroup>
            </div>

            <TaskStatusCardsGrid countsByStatus={statusSummary.countsByStatus} />

            <div className="space-y-4">
                <TasksToolbar
                    statusFilter={filters.statusFilter}
                    onStatusFilterChange={filters.setStatusFilter}
                    assignedToId={filters.assignedToId}
                    onAssignedToIdChange={filters.setAssignedToId}
                    branchId={filters.branchId}
                    onBranchIdChange={filters.setBranchId}
                    search={filters.search}
                    onSearchChange={filters.setSearch}
                    onAddTask={openCreate}
                    hideStatusFilter={view === "board"}
                />

                {view === "table" ? (
                    <>
                        <TasksTable
                            tasks={table.tasks}
                            isLoading={table.isLoading}
                            sortBy={table.sortBy}
                            sortOrder={table.sortOrder}
                            onSort={table.toggleSort}
                            onRowClick={openEdit}
                        />
                        <TasksPagination
                            page={pagination.page}
                            limit={pagination.limit}
                            total={pagination.total}
                            onPageChange={pagination.setPage}
                            onLimitChange={pagination.setLimit}
                        />
                    </>
                ) : (
                    <TaskKanbanBoard
                        search={filters.search}
                        assignedToId={filters.assignedToId}
                        branchId={filters.branchId}
                        onStatusChange={(taskId, status) => actions.changeStatus.mutate({ id: taskId, status })}
                        onCardClick={openEdit}
                    />
                )}
            </div>

            <TaskFormSheet
                open={formOpen}
                task={editingTask}
                isSubmitting={actions.create.isPending || actions.update.isPending}
                hasError={actions.create.isError || actions.update.isError}
                onClose={closeForm}
                onSubmit={handleSubmit}
            />
        </div>
    );
}