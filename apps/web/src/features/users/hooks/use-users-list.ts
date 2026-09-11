import {useMemo, useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {toast} from "@/components/ui/toast.tsx";
import {useAuth} from "@/features/auth/hooks/use-auth.ts";
import {
    createUser,
    type CreateUserPayload,
    deactivateUser,
    deleteUser,
    getUserRoleSummary,
    getUsers,
    transferUserBranch,
    updateUser,
    type UpdateUserPayload,
    type UserSortField,
} from "@/features/users/api/users.api.ts";
import {getVisibleRoles, type User, type UserRole} from "@/features/users/types/user.types";
import {initials} from "@/features/users/utils/format.ts";
import {useTranslation} from "react-i18next";
import {useSort} from "@/hooks/use-sort.ts";

export type StatusFilter = "all" | "active" | "inactive";
export type RoleFilterValue = UserRole | "all";

export function useUsersList() {
    const { t } = useTranslation("users");
    const { user: currentUser } = useAuth();
    const visibleRoles = useMemo(() => getVisibleRoles(currentUser?.role), [currentUser?.role]);

    const queryClient = useQueryClient();

    const [statusFilter, setStatusFilterState] = useState<StatusFilter>("all");
    const [roleFilter, setRoleFilterState] = useState<RoleFilterValue>("all");
    const [branchFilter, setBranchFilterState] = useState<string | "all">("all");
    const [search, setSearchState] = useState("");
    const [page, setPage] = useState(1);
    const [limit, setLimitState] = useState(10);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const {sortBy, sortOrder, toggleSort} = useSort<UserSortField>();

    const [formOpen, setFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [pendingDeactivate, setPendingDeactivate] = useState<User | null>(null);
    const [pendingTransfer, setPendingTransfer] = useState<User | null>(null);

    const tableQuery = useQuery({
        queryKey: ["users", { statusFilter, roleFilter, branchFilter, search, page, limit, sortBy, sortOrder }],
        queryFn: () =>
            getUsers({
                page,
                limit,
                role: roleFilter === "all" ? undefined : roleFilter,
                isActive: statusFilter === "all" ? undefined : statusFilter === "active",
                branchId: branchFilter === "all" ? undefined : branchFilter,
                search: search || undefined,
                sortBy,
                sortOrder,
            }),
    });

    const roleSummaryQuery = useQuery({
        queryKey: ["users", "role-summary"],
        queryFn: getUserRoleSummary,
    });

    const createMutation = useMutation({
        mutationFn: (payload: CreateUserPayload) => createUser(payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["users"] });
            toast.success({
                title: t("toasts.createSuccessTitle"),
                description: t("toasts.createSuccessDescription"),
            });
            closeForm();
        },
        onError: () => {
            toast.error({
                title: t("toasts.createErrorTitle"),
                description: t("toasts.createErrorDescription"),
            });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) => updateUser(id, payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["users"] });
            toast.success({
                title: t("toasts.updateSuccessTitle"),
                description: t("toasts.updateSuccessDescription"),
            });
            closeForm();
        },
        onError: () => {
            toast.error({
                title: t("toasts.updateErrorTitle"),
                description: t("toasts.updateErrorDescription"),
            });
        },
    });

    const deactivateMutation = useMutation({
        mutationFn: ({ id, reassignToId }: { id: string; reassignToId?: string }) =>
            deactivateUser(id, reassignToId),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["users"] });
            toast.success({
                title: t("toasts.deactivateSuccessTitle"),
                description: t("toasts.deactivateSuccessDescription"),
            });
            setPendingDeactivate(null);
        },
        onError: () => {
            toast.error({
                title: t("toasts.deactivateErrorTitle"),
                description: t("toasts.deactivateErrorDescription"),
            });
        },
    });

    const transferBranchMutation = useMutation({
        mutationFn: ({ id, branchId, reassignToId }: { id: string; branchId: string; reassignToId?: string }) =>
            transferUserBranch(id, branchId, reassignToId),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["users"] });
            toast.success({
                title: t("card.transferBranchDialog.success", { name: pendingTransfer?.fullName ?? "" }),
            });
            setPendingTransfer(null);
        },
        onError: () => {
            toast.error({ title: t("card.transferBranchDialog.error") });
        },
    });

    const bulkDeactivateMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            const results = await Promise.allSettled(ids.map((id) => deleteUser(id)));
            const failed = results.filter((r) => r.status === "rejected").length;

            if (failed > 0) {
                throw new Error(
                    failed === ids.length
                        ? t("toasts.bulkDeactivateAllFailed")
                        : t("toasts.bulkDeactivatePartialFailed", { failed, count: ids.length }),
                );
            }
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["users"] });
            toast.success({
                title: t("toasts.bulkDeactivateSuccessTitle"),
                description: t("toasts.bulkDeactivateSuccessDescription"),
            });
            setSelectedIds(new Set());
        },
        onError: async (error: Error) => {
            await queryClient.invalidateQueries({ queryKey: ["users"] });
            toast.error({ title: t("toasts.bulkDeactivateErrorTitle"), description: error.message });
            setSelectedIds(new Set());
        },
    });

    const clearSelection = () => setSelectedIds(new Set());

    const membersByRole = useMemo(() => {
        const map = new Map<UserRole, { count: number; initials: string[] }>(
            visibleRoles.map((role) => [role, { count: 0, initials: [] }]),
        );

        for (const item of roleSummaryQuery.data ?? []) {
            map.set(item.role, {
                count: item.count,
                initials: item.sample.map((u) => initials(u.fullName)),
            });
        }

        return map;
    }, [roleSummaryQuery.data, visibleRoles]);

    const openCreateForm = () => {
        setEditingUser(null);
        setFormOpen(true);
    };

    const openEditForm = (user: User) => {
        setEditingUser(user);
        setFormOpen(true);
    };

    const closeForm = () => {
        setFormOpen(false);
        setEditingUser(null);
        createMutation.reset();
        updateMutation.reset();
    };

    const handleSubmit = (payload: CreateUserPayload | UpdateUserPayload) => {
        if (editingUser) {
            updateMutation.mutate({ id: editingUser.id, payload: payload as UpdateUserPayload });
            return;
        }
        createMutation.mutate(payload as CreateUserPayload);
    };

    const toggleSelectAll = (checked: boolean) => {
        if (!checked) {
            setSelectedIds(new Set());
            return;
        }
        setSelectedIds(new Set((tableQuery.data?.items ?? []).map((u) => u.id)));
    };

    const toggleSelectOne = (id: string, checked: boolean) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (checked) {
                next.add(id);
            } else {
                next.delete(id);
            }
            return next;
        });
    };

    const users = tableQuery.data?.items ?? [];
    const meta = tableQuery.data?.meta;
    const allSelected = users.length > 0 && selectedIds.size === users.length;

    return {
        visibleRoles,

        filters: {
            statusFilter,
            setStatusFilter: (value: StatusFilter) => {
                setStatusFilterState(value);
                setPage(1);
            },
            roleFilter,
            setRoleFilter: (value: RoleFilterValue) => {
                setRoleFilterState(value);
                setPage(1);
            },
            branchFilter,
            setBranchFilter: (value: string | "all") => {
                setBranchFilterState(value);
                setPage(1);
            },
            search,
            setSearch: (value: string) => {
                setSearchState(value);
                setPage(1);
            },
        },

        pagination: {
            page,
            limit,
            total: meta?.total ?? 0,
            setPage,
            setLimit: (value: number) => {
                setLimitState(value);
                setPage(1);
            },
        },

        table: {
            users,
            isLoading: tableQuery.isLoading,
            sortBy,
            sortOrder,
            toggleSort: (field: UserSortField) => {
                toggleSort(field);
                setPage(1);
            },
        },

        selection: {
            selectedIds,
            allSelected,
            toggleSelectAll,
            toggleSelectOne,
            clear: clearSelection,
            bulkDeactivate: () => bulkDeactivateMutation.mutate(Array.from(selectedIds)),
            isBulkDeactivating: bulkDeactivateMutation.isPending,
        },

        roleCards: {
            membersByRole,
        },

        form: {
            open: formOpen,
            editingUser,
            isSubmitting: createMutation.isPending || updateMutation.isPending,
            hasError: createMutation.isError || updateMutation.isError,
            openCreateForm,
            openEditForm,
            closeForm,
            handleSubmit,
        },

        actions: {
            requestDeactivate: (user: User) => setPendingDeactivate(user),
            isDeleting: (id: string) => deactivateMutation.isPending && deactivateMutation.variables?.id === id,
            requestTransferBranch: (user: User) => setPendingTransfer(user),
        },

        deactivateDialog: {
            user: pendingDeactivate,
            open: pendingDeactivate !== null,
            isSubmitting: deactivateMutation.isPending,
            onOpenChange: (open: boolean) => {
                if (!open) setPendingDeactivate(null);
            },
            onConfirm: (reassignToId?: string) => {
                if (!pendingDeactivate) return;
                deactivateMutation.mutate({ id: pendingDeactivate.id, reassignToId });
            },
        },

        transferBranchDialog: {
            user: pendingTransfer,
            open: pendingTransfer !== null,
            isSubmitting: transferBranchMutation.isPending,
            onOpenChange: (open: boolean) => {
                if (!open) setPendingTransfer(null);
            },
            onConfirm: (branchId: string, reassignToId?: string) => {
                if (!pendingTransfer) return;
                transferBranchMutation.mutate({ id: pendingTransfer.id, branchId, reassignToId });
            },
        },
    };
}