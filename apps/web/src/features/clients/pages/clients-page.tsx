import {ClientsToolbar} from "@/features/clients/components/clients-toolbar.tsx";
import {ClientsTable} from "@/features/clients/components/clients-table.tsx";
import {ClientsPagination} from "@/features/clients/components/clients-pagination.tsx";
import {ClientsActionBar} from "@/features/clients/components/clients-action-bar.tsx";
import {ClientFormSheet} from "@/features/clients/components/client-form-sheet.tsx";
import {DeleteClientDialog} from "@/features/clients/components/delete-client-dialog.tsx";
import {DeleteClientsDialog} from "@/features/clients/components/delete-clients-dialog.tsx";
import {useClientsList} from "@/features/clients/hooks/use-clients-list.ts";
import {useTranslation} from "react-i18next";

export function ClientsPage() {
    const { t } = useTranslation("clients");
    const { filters, pagination, table, selection, form, actions, deleteDialog, bulkDeleteDialog } = useClientsList();

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <h2 className="text-2xl font-medium tracking-tight">{t("page.title")}</h2>
            </div>

            <div className="space-y-4">
                <ClientsToolbar
                    search={filters.search}
                    onSearchChange={filters.setSearch}
                    projectFilter={filters.projectFilter}
                    onProjectFilterChange={filters.setProjectFilter}
                    branchFilter={filters.branchFilter}
                    onBranchFilterChange={filters.setBranchFilter}
                    onAddClient={form.openCreateForm}
                />

                <ClientsTable
                    clients={table.clients}
                    isLoading={table.isLoading}
                    sortBy={table.sortBy}
                    sortOrder={table.sortOrder}
                    onSort={table.toggleSort}
                    selectedIds={selection.selectedIds}
                    allSelected={selection.allSelected}
                    onToggleAll={selection.toggleSelectAll}
                    onToggleOne={selection.toggleSelectOne}
                    onEdit={form.openEditForm}
                    onDelete={actions.requestDelete}
                    isDeleting={actions.isDeleting}
                />

                <ClientsPagination
                    page={pagination.page}
                    limit={pagination.limit}
                    total={pagination.total}
                    onPageChange={pagination.setPage}
                    onLimitChange={pagination.setLimit}
                />
            </div>

            <ClientsActionBar
                selectedCount={selection.selectedIds.size}
                isProcessing={bulkDeleteDialog.isDeleting}
                onClear={selection.clear}
                onDelete={bulkDeleteDialog.onOpen}
            />

            <ClientFormSheet
                open={form.open}
                client={form.editingClient}
                isSubmitting={form.isSubmitting}
                hasError={form.hasError}
                onClose={form.closeForm}
                onSubmit={form.handleSubmit}
            />

            <DeleteClientDialog
                client={deleteDialog.client}
                isDeleting={deleteDialog.isDeleting}
                onCancel={deleteDialog.onCancel}
                onConfirm={deleteDialog.onConfirm}
            />

            <DeleteClientsDialog
                open={bulkDeleteDialog.open}
                count={bulkDeleteDialog.count}
                isDeleting={bulkDeleteDialog.isDeleting}
                onCancel={bulkDeleteDialog.onCancel}
                onConfirm={bulkDeleteDialog.onConfirm}
            />
        </div>
    );
}