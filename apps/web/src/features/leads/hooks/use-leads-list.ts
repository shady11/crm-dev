import {useState} from "react";
import {isAxiosError} from "axios";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {toast} from "@/components/ui/toast.tsx";
import {useTranslation} from "react-i18next";
import {
    type ConvertLeadPayload,
    convertLead,
    createLead,
    type CreateLeadPayload,
    deleteLead,
    type DuplicateLeadConflict,
    getLeads,
    type Lead,
    type LeadSortField,
    reassignLeadManager,
    transferLeadBranch,
    updateLead,
    type UpdateLeadPayload,
} from "@/features/leads/api/leads.api.ts";
import type {LeadStatus} from "@/features/leads/types/lead.types.ts";
import {useSort} from "@/hooks/use-sort.ts";

export type LeadStatusFilterValue = LeadStatus | "all";

export function useLeadsList() {
    const { t } = useTranslation("leads");
    const queryClient = useQueryClient();

    const [search, setSearchState] = useState("");
    const [statusFilter, setStatusFilterState] = useState<LeadStatusFilterValue>("all");
    const [branchFilter, setBranchFilterState] = useState<string | "all">("all");
    const [page, setPage] = useState(1);
    const [limit, setLimitState] = useState(10);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const {sortBy, sortOrder, toggleSort} = useSort<LeadSortField>();

    const [formOpen, setFormOpen] = useState(false);
    const [editingLead, setEditingLead] = useState<Lead | null>(null);
    const [duplicateWarning, setDuplicateWarning] = useState<{
        payload: CreateLeadPayload;
        duplicates: DuplicateLeadConflict["duplicates"];
    } | null>(null);

    const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
    const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
    const [convertTarget, setConvertTarget] = useState<Lead | null>(null);
    const [detailsTarget, setDetailsTarget] = useState<Lead | null>(null);
    const [transferTarget, setTransferTarget] = useState<Lead | null>(null);
    const [reassignTarget, setReassignTarget] = useState<Lead | null>(null);

    const tableQuery = useQuery({
        queryKey: ["leads", { search, statusFilter, branchFilter, page, limit, sortBy, sortOrder }],
        queryFn: () =>
            getLeads({
                page,
                limit,
                search: search || undefined,
                status: statusFilter === "all" ? undefined : statusFilter,
                branchId: branchFilter === "all" ? undefined : branchFilter,
                sortBy,
                sortOrder,
            }),
    });

    const createMutation = useMutation({
        mutationFn: (payload: CreateLeadPayload) => createLead(payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["leads"] });
            toast.success({ title: t("toasts.createSuccessTitle"), description: t("toasts.createSuccessDescription") });
            setDuplicateWarning(null);
            closeForm();
        },
        onError: (error, payload) => {
            if (isAxiosError<DuplicateLeadConflict>(error) && error.response?.status === 409) {
                setDuplicateWarning({ payload, duplicates: error.response.data.duplicates });
                return;
            }
            toast.error({ title: t("toasts.createErrorTitle"), description: t("toasts.createErrorDescription") });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: UpdateLeadPayload }) => updateLead(id, payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["leads"] });
            toast.success({ title: t("toasts.updateSuccessTitle"), description: t("toasts.updateSuccessDescription") });
            closeForm();
        },
        onError: () => {
            toast.error({ title: t("toasts.updateErrorTitle"), description: t("toasts.updateErrorDescription") });
        },
    });

    const convertMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: ConvertLeadPayload }) => convertLead(id, payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["leads"] });
            await queryClient.invalidateQueries({ queryKey: ["clients"] });
            toast.success({ title: t("toasts.convertSuccessTitle"), description: t("toasts.convertSuccessDescription") });
            setConvertTarget(null);
        },
        onError: () => {
            toast.error({ title: t("toasts.convertErrorTitle"), description: t("toasts.convertErrorDescription") });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteLead,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["leads"] });
            toast.success({ title: t("toasts.deleteSuccessTitle"), description: t("toasts.deleteSuccessDescription") });
            setDeleteTarget(null);
            setDetailsTarget(null);
        },
        onError: () => {
            toast.error({ title: t("toasts.deleteErrorTitle"), description: t("toasts.deleteErrorDescription") });
        },
    });

    const transferBranchMutation = useMutation({
        mutationFn: ({ id, branchId }: { id: string; branchId: string }) => transferLeadBranch(id, branchId),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["leads"] });
            toast.success({ title: t("detailsSheet.transferBranch.successTitle") });
            setTransferTarget(null);
        },
        onError: () => {
            toast.error({ title: t("detailsSheet.transferBranch.errorTitle") });
        },
    });

    // SH-A1: SALES_HEAD moving a lead between their own team's SALES_MANAGERs.
    const reassignMutation = useMutation({
        mutationFn: ({ id, managerId }: { id: string; managerId: string }) => reassignLeadManager(id, managerId),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["leads"] });
            toast.success({ title: t("reassignDialog.successTitle", { ns: "users" }) });
            setReassignTarget(null);
        },
        onError: () => {
            toast.error({ title: t("reassignDialog.errorTitle", { ns: "users" }) });
        },
    });

    const bulkDeleteMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            const results = await Promise.allSettled(ids.map((id) => deleteLead(id)));
            const failed = results.filter((r) => r.status === "rejected").length;

            if (failed > 0) {
                throw new Error(
                    failed === ids.length
                        ? t("toasts.bulkDeleteAllFailed")
                        : t("toasts.bulkDeletePartialFailed", { failed, total: ids.length }),
                );
            }
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["leads"] });
            toast.success({ title: t("toasts.bulkDeleteSuccessTitle"), description: t("toasts.bulkDeleteSuccessDescription") });
            setSelectedIds(new Set());
            setBulkDeleteDialogOpen(false);
        },
        onError: async (error: Error) => {
            await queryClient.invalidateQueries({ queryKey: ["leads"] });
            toast.error({ title: t("toasts.bulkDeleteIssuesTitle"), description: error.message });
            setSelectedIds(new Set());
            setBulkDeleteDialogOpen(false);
        },
    });

    const clearSelection = () => setSelectedIds(new Set());

    const openCreateForm = () => {
        setEditingLead(null);
        setFormOpen(true);
    };

    const openEditForm = (lead: Lead) => {
        setEditingLead(lead);
        setFormOpen(true);
    };

    const closeForm = () => {
        setFormOpen(false);
        setEditingLead(null);
        setDuplicateWarning(null);
        createMutation.reset();
        updateMutation.reset();
    };

    const handleSubmit = (payload: CreateLeadPayload | UpdateLeadPayload) => {
        setDuplicateWarning(null);
        if (editingLead) {
            updateMutation.mutate({ id: editingLead.id, payload: payload as UpdateLeadPayload });
            return;
        }
        createMutation.mutate(payload as CreateLeadPayload);
    };

    const confirmCreateDuplicate = () => {
        if (!duplicateWarning) return;
        createMutation.mutate({ ...duplicateWarning.payload, confirmDuplicate: true });
    };

    const toggleSelectAll = (checked: boolean) => {
        if (!checked) {
            setSelectedIds(new Set());
            return;
        }
        setSelectedIds(new Set((tableQuery.data?.items ?? []).map((l) => l.id)));
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

    const requestDelete = (lead: Lead) => setDeleteTarget(lead);
    const cancelDelete = () => setDeleteTarget(null);
    const confirmDelete = () => {
        if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.id);
        }
    };

    const requestConvert = (lead: Lead) => setConvertTarget(lead);
    const cancelConvert = () => setConvertTarget(null);
    const confirmConvert = (payload: ConvertLeadPayload) => {
        if (convertTarget) {
            convertMutation.mutate({ id: convertTarget.id, payload });
        }
    };

    const openBulkDeleteDialog = () => setBulkDeleteDialogOpen(true);
    const closeBulkDeleteDialog = () => setBulkDeleteDialogOpen(false);
    const confirmBulkDelete = () => bulkDeleteMutation.mutate(Array.from(selectedIds));

    const leads = tableQuery.data?.items ?? [];
    const meta = tableQuery.data?.meta;
    const allSelected = leads.length > 0 && selectedIds.size === leads.length;

    // Resolve to the freshest copy from the list query (so edits/conversions made
    // while the sheet is open are reflected immediately), falling back to the
    // originally clicked lead if it's no longer in the current page/filter.
    const detailsLead = detailsTarget ? (leads.find((l) => l.id === detailsTarget.id) ?? detailsTarget) : null;

    const openDetails = (lead: Lead) => setDetailsTarget(lead);
    const closeDetails = () => setDetailsTarget(null);

    return {
        filters: {
            search,
            setSearch: (value: string) => {
                setSearchState(value);
                setPage(1);
            },
            statusFilter,
            setStatusFilter: (value: LeadStatusFilterValue) => {
                setStatusFilterState(value);
                setPage(1);
            },
            branchFilter,
            setBranchFilter: (value: string | "all") => {
                setBranchFilterState(value);
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
            leads,
            isLoading: tableQuery.isLoading,
            sortBy,
            sortOrder,
            toggleSort: (field: LeadSortField) => {
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
        },

        form: {
            open: formOpen,
            editingLead,
            isSubmitting: createMutation.isPending || updateMutation.isPending,
            hasError: (createMutation.isError && !duplicateWarning) || updateMutation.isError,
            duplicateWarning,
            onConfirmDuplicate: confirmCreateDuplicate,
            onDismissDuplicate: () => setDuplicateWarning(null),
            openCreateForm,
            openEditForm,
            closeForm,
            handleSubmit,
        },

        actions: {
            requestDelete,
            isDeleting: (id: string) => deleteMutation.isPending && deleteMutation.variables === id,
            requestConvert,
        },

        deleteDialog: {
            lead: deleteTarget,
            isDeleting: deleteMutation.isPending,
            onCancel: cancelDelete,
            onConfirm: confirmDelete,
        },

        bulkDeleteDialog: {
            open: bulkDeleteDialogOpen,
            count: selectedIds.size,
            isDeleting: bulkDeleteMutation.isPending,
            onOpen: openBulkDeleteDialog,
            onCancel: closeBulkDeleteDialog,
            onConfirm: confirmBulkDelete,
        },

        convertDialog: {
            lead: convertTarget,
            isConverting: convertMutation.isPending,
            hasError: convertMutation.isError,
            onCancel: cancelConvert,
            onConfirm: confirmConvert,
        },

        detailsSheet: {
            lead: detailsLead,
            open: !!detailsTarget,
            onOpen: openDetails,
            onOpenChange: (isOpen: boolean) => {
                if (!isOpen) closeDetails();
            },
            onEdit: () => {
                if (detailsLead) {
                    closeDetails();
                    openEditForm(detailsLead);
                }
            },
            onRequestConvert: () => {
                if (detailsLead) requestConvert(detailsLead);
            },
            onRequestDelete: () => {
                if (detailsLead) requestDelete(detailsLead);
            },
            onRequestTransferBranch: () => {
                if (detailsLead) setTransferTarget(detailsLead);
            },
            onRequestReassign: () => {
                if (detailsLead) setReassignTarget(detailsLead);
            },
        },

        transferBranchDialog: {
            lead: transferTarget,
            open: transferTarget !== null,
            isSubmitting: transferBranchMutation.isPending,
            onOpenChange: (open: boolean) => {
                if (!open) setTransferTarget(null);
            },
            onConfirm: (branchId: string) => {
                if (!transferTarget) return;
                transferBranchMutation.mutate({ id: transferTarget.id, branchId });
            },
        },

        reassignDialog: {
            lead: reassignTarget,
            open: reassignTarget !== null,
            isSubmitting: reassignMutation.isPending,
            onOpenChange: (open: boolean) => {
                if (!open) setReassignTarget(null);
            },
            onConfirm: (managerId: string) => {
                if (!reassignTarget) return;
                reassignMutation.mutate({ id: reassignTarget.id, managerId });
            },
        },
    };
}
