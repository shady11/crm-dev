import {RoleCardsGrid} from "@/features/users/components/role-cards-grid.tsx";
import {UsersToolbar} from "@/features/users/components/users-toolbar.tsx";
import {UsersTable} from "@/features/users/components/users-table.tsx";
import {UsersPagination} from "@/features/users/components/users-pagination.tsx";
import {UserFormSheet} from "@/features/users/components/user-form-sheet.tsx";
import {DeactivateUserDialog} from "@/features/users/components/deactivate-user-dialog.tsx";
import {TransferBranchDialog} from "@/features/users/components/transfer-branch-dialog.tsx";
import {useUsersList} from "@/features/users/hooks/use-users-list.ts";
import {UsersActionBar} from "@/features/users/components/users-action-bar.tsx";
import {useTranslation} from "react-i18next";

export function UsersPage() {
    const {
        visibleRoles,
        filters,
        pagination,
        table,
        selection,
        roleCards,
        form,
        actions,
        deactivateDialog,
        transferBranchDialog,
    } = useUsersList();
    const { t } = useTranslation("users");

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <h2 className="text-2xl font-medium tracking-tight">{t("page.rolesHeading")}</h2>
            </div>

            <RoleCardsGrid roles={visibleRoles} membersByRole={roleCards.membersByRole} />

            <div className="space-y-4">
                <UsersToolbar
                    statusFilter={filters.statusFilter}
                    onStatusFilterChange={filters.setStatusFilter}
                    roleFilter={filters.roleFilter}
                    onRoleFilterChange={filters.setRoleFilter}
                    visibleRoles={visibleRoles}
                    branchFilter={filters.branchFilter}
                    onBranchFilterChange={filters.setBranchFilter}
                    search={filters.search}
                    onSearchChange={filters.setSearch}
                    onAddUser={form.openCreateForm}
                />

                <UsersTable
                    users={table.users}
                    isLoading={table.isLoading}
                    selectedIds={selection.selectedIds}
                    allSelected={selection.allSelected}
                    onToggleAll={selection.toggleSelectAll}
                    onToggleOne={selection.toggleSelectOne}
                    onEdit={form.openEditForm}
                    onDelete={actions.requestDeactivate}
                    isDeleting={actions.isDeleting}
                    onTransferBranch={actions.requestTransferBranch}
                />

                <UsersPagination
                    page={pagination.page}
                    limit={pagination.limit}
                    total={pagination.total}
                    onPageChange={pagination.setPage}
                    onLimitChange={pagination.setLimit}
                />
            </div>

            <UsersActionBar
                selectedCount={selection.selectedIds.size}
                isProcessing={selection.isBulkDeactivating}
                onClear={selection.clear}
                onDeactivate={selection.bulkDeactivate}
            />

            <UserFormSheet
                open={form.open}
                user={form.editingUser}
                isSubmitting={form.isSubmitting}
                hasError={form.hasError}
                onClose={form.closeForm}
                onSubmit={form.handleSubmit}
            />

            <DeactivateUserDialog
                user={deactivateDialog.user}
                open={deactivateDialog.open}
                isSubmitting={deactivateDialog.isSubmitting}
                onOpenChange={deactivateDialog.onOpenChange}
                onConfirm={deactivateDialog.onConfirm}
            />

            <TransferBranchDialog
                user={transferBranchDialog.user}
                open={transferBranchDialog.open}
                isSubmitting={transferBranchDialog.isSubmitting}
                onOpenChange={transferBranchDialog.onOpenChange}
                onConfirm={transferBranchDialog.onConfirm}
            />
        </div>
    );
}