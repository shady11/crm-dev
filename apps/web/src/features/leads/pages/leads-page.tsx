import {LeadsToolbar} from "@/features/leads/components/leads-toolbar.tsx";
import {LeadsTable} from "@/features/leads/components/leads-table.tsx";
import {LeadsPagination} from "@/features/leads/components/leads-pagination.tsx";
import {LeadsActionBar} from "@/features/leads/components/leads-action-bar.tsx";
import {LeadFormSheet} from "@/features/leads/components/lead-form-sheet.tsx";
import {DeleteLeadDialog} from "@/features/leads/components/delete-lead-dialog.tsx";
import {DeleteLeadsDialog} from "@/features/leads/components/delete-leads-dialog.tsx";
import {ConvertLeadDialog} from "@/features/leads/components/convert-lead-dialog.tsx";
import {LeadDetailsSheet} from "@/features/leads/components/lead-details-sheet.tsx";
import {MoveToBranchDialog} from "@/features/branches/components/move-to-branch-dialog.tsx";
import {ReassignManagerDialog} from "@/features/users/components/reassign-manager-dialog.tsx";
import {useLeadsList} from "@/features/leads/hooks/use-leads-list.ts";
import {useTranslation} from "react-i18next";

export function LeadsPage() {
    const { t } = useTranslation("leads");
    const {
        filters,
        pagination,
        table,
        selection,
        form,
        deleteDialog,
        bulkDeleteDialog,
        convertDialog,
        detailsSheet,
        transferBranchDialog,
        reassignDialog,
    } = useLeadsList();

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <h2 className="text-2xl font-medium tracking-tight">{t("page.title")}</h2>
            </div>

            <div className="space-y-4">
                <LeadsToolbar
                    search={filters.search}
                    onSearchChange={filters.setSearch}
                    statusFilter={filters.statusFilter}
                    onStatusFilterChange={filters.setStatusFilter}
                    branchFilter={filters.branchFilter}
                    onBranchFilterChange={filters.setBranchFilter}
                    onAddLead={form.openCreateForm}
                />

                <LeadsTable
                    leads={table.leads}
                    isLoading={table.isLoading}
                    sortBy={table.sortBy}
                    sortOrder={table.sortOrder}
                    onSort={table.toggleSort}
                    selectedIds={selection.selectedIds}
                    allSelected={selection.allSelected}
                    onToggleAll={selection.toggleSelectAll}
                    onToggleOne={selection.toggleSelectOne}
                    onRowClick={detailsSheet.onOpen}
                />

                <LeadsPagination
                    page={pagination.page}
                    limit={pagination.limit}
                    total={pagination.total}
                    onPageChange={pagination.setPage}
                    onLimitChange={pagination.setLimit}
                />
            </div>

            <LeadsActionBar
                selectedCount={selection.selectedIds.size}
                isProcessing={bulkDeleteDialog.isDeleting}
                onClear={selection.clear}
                onRequestDelete={bulkDeleteDialog.onOpen}
            />

            <LeadFormSheet
                open={form.open}
                lead={form.editingLead}
                isSubmitting={form.isSubmitting}
                hasError={form.hasError}
                duplicateWarning={form.duplicateWarning?.duplicates ?? null}
                onConfirmDuplicate={form.onConfirmDuplicate}
                onDismissDuplicate={form.onDismissDuplicate}
                onClose={form.closeForm}
                onSubmit={form.handleSubmit}
            />

            <DeleteLeadDialog
                lead={deleteDialog.lead}
                isDeleting={deleteDialog.isDeleting}
                onCancel={deleteDialog.onCancel}
                onConfirm={deleteDialog.onConfirm}
            />

            <DeleteLeadsDialog
                open={bulkDeleteDialog.open}
                count={bulkDeleteDialog.count}
                isDeleting={bulkDeleteDialog.isDeleting}
                onCancel={bulkDeleteDialog.onCancel}
                onConfirm={bulkDeleteDialog.onConfirm}
            />

            <ConvertLeadDialog
                lead={convertDialog.lead}
                isSubmitting={convertDialog.isConverting}
                errorMessage={convertDialog.hasError ? t("convertDialog.error") : undefined}
                onClose={convertDialog.onCancel}
                onConfirm={convertDialog.onConfirm}
            />

            <LeadDetailsSheet
                lead={detailsSheet.lead}
                open={detailsSheet.open}
                onOpenChange={detailsSheet.onOpenChange}
                onEdit={detailsSheet.onEdit}
                onRequestConvert={detailsSheet.onRequestConvert}
                onRequestDelete={detailsSheet.onRequestDelete}
                onRequestTransferBranch={detailsSheet.onRequestTransferBranch}
                onRequestReassign={detailsSheet.onRequestReassign}
            />

            <MoveToBranchDialog
                open={transferBranchDialog.open}
                entityName={transferBranchDialog.lead?.fullName ?? ""}
                currentBranchId={transferBranchDialog.lead?.branchId ?? null}
                isSubmitting={transferBranchDialog.isSubmitting}
                onOpenChange={transferBranchDialog.onOpenChange}
                onConfirm={transferBranchDialog.onConfirm}
            />

            <ReassignManagerDialog
                open={reassignDialog.open}
                entityName={reassignDialog.lead?.fullName ?? ""}
                branchId={reassignDialog.lead?.branchId ?? null}
                currentManagerId={reassignDialog.lead?.manager?.id ?? null}
                isSubmitting={reassignDialog.isSubmitting}
                onOpenChange={reassignDialog.onOpenChange}
                onConfirm={reassignDialog.onConfirm}
            />
        </div>
    );
}
