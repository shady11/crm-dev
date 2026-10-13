import {useState} from "react";
import {useSearchParams} from "react-router-dom";
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
    getLead,
    getLeads,
    type Lead,
    type LeadSortField,
    reassignLeadManager,
    restoreLead,
    transferLeadBranch,
    updateLead,
    type UpdateLeadPayload,
} from "@/features/leads/api/leads.api.ts";
import {LeadStatus} from "@/features/leads/types/lead.types.ts";
import {useSort} from "@/hooks/use-sort.ts";
import {useDebouncedValue} from "@/hooks/use-debounced-value.ts";
import {toastWithUndo} from "@/lib/undo-toast.ts";
import {useAuth} from "@/features/auth/hooks/use-auth.ts";

export type LeadStatusFilterValue = LeadStatus | "OPEN" | "all";

const STATUS_FILTERS: LeadStatusFilterValue[] = ["OPEN", ...Object.values(LeadStatus)];

export function useLeadsList() {
    const { t } = useTranslation("leads");
    const queryClient = useQueryClient();
    const { user } = useAuth();

    // ?managerId=…&status=… seed the filters, so My team can open one
    // manager's open leads (SH-4); the toolbar takes over from there.
    const [searchParams, setSearchParams] = useSearchParams();
    const [search, setSearchState] = useState("");
    const [statusFilter, setStatusFilterState] = useState<LeadStatusFilterValue>(
        () => STATUS_FILTERS.find((s) => s === searchParams.get("status")) ?? "all",
    );
    const [branchFilter, setBranchFilterState] = useState<string | "all">("all");
    const [sourceFilter, setSourceFilterState] = useState<string | "all">("all");
    // "My leads" is the manager filter set to yourself; the two are one filter.
    const [managerFilter, setManagerFilterState] = useState<string | "all">(() => searchParams.get("managerId") ?? "all");
    const [mineOnly, setMineOnlyState] = useState(false);
    const [page, setPage] = useState(1);
    const [limit, setLimitState] = useState(10);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const {sortBy, sortOrder, toggleSort} = useSort<LeadSortField>();
    const debouncedSearch = useDebouncedValue(search);

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

    // ?lead=<id> opens that lead's details sheet: where a "lead reassigned
    // to you" notification points, since a lead has no page of its own.
    const linkedLeadId = searchParams.get("lead");
    const linkedLeadQuery = useQuery({
        queryKey: ["leads", "detail", linkedLeadId],
        queryFn: () => getLead(linkedLeadId!),
        enabled: !!linkedLeadId,
    });

    const tableQuery = useQuery({
        queryKey: ["leads", { search: debouncedSearch, statusFilter, branchFilter, sourceFilter, managerFilter, mineOnly, page, limit, sortBy, sortOrder }],
        queryFn: () =>
            getLeads({
                page,
                limit,
                search: debouncedSearch || undefined,
                status: statusFilter === "all" ? undefined : statusFilter,
                branchId: branchFilter === "all" ? undefined : branchFilter,
                source: sourceFilter === "all" ? undefined : sourceFilter,
                managerId: mineOnly ? user?.id : managerFilter === "all" ? undefined : managerFilter,
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

    const invalidateLeads = () => queryClient.invalidateQueries({ queryKey: ["leads"] });
    // Reassigning a lead moves its open tasks too.
    const invalidateAfterReassign = async () => {
        await invalidateLeads();
        await queryClient.invalidateQueries({ queryKey: ["tasks"] });
    };

    const deleteMutation = useMutation({
        mutationFn: deleteLead,
        onSuccess: async (_data, id) => {
            await invalidateLeads();
            toastWithUndo({
                title: t("toasts.deleteSuccessTitle"),
                description: t("toasts.deleteSuccessDescription"),
                undo: () => restoreLead(id),
                onUndone: invalidateLeads,
            });
            setDeleteTarget(null);
            setDetailsTarget(null);
        },
        onError: () => {
            toast.error({ title: t("toasts.deleteErrorTitle"), description: t("toasts.deleteErrorDescription") });
        },
    });

    const transferBranchMutation = useMutation({
        mutationFn: ({ id, branchId }: { id: string; branchId: string; previousBranchId: string | null }) =>
            transferLeadBranch(id, branchId),
        onSuccess: async (_data, { id, previousBranchId }) => {
            await invalidateLeads();
            const title = t("detailsSheet.transferBranch.successTitle");
            // A lead that had no branch can't be moved back to "none" — the
            // transfer endpoint only accepts a real branch.
            if (previousBranchId) {
                toastWithUndo({
                    title,
                    undo: () => transferLeadBranch(id, previousBranchId),
                    onUndone: invalidateLeads,
                });
            } else {
                toast.success({ title });
            }
            setTransferTarget(null);
        },
        onError: () => {
            toast.error({ title: t("detailsSheet.transferBranch.errorTitle") });
        },
    });

    // SH-A1: SALES_HEAD moving a lead between their own team's SALES_MANAGERs.
    const reassignMutation = useMutation({
        mutationFn: ({ id, managerId }: { id: string; managerId: string; previousManagerId: string | null }) =>
            reassignLeadManager(id, managerId),
        onSuccess: async (_data, { id, previousManagerId }) => {
            await invalidateAfterReassign();
            const title = t("reassignDialog.successTitle", { ns: "users" });
            if (previousManagerId) {
                toastWithUndo({
                    title,
                    undo: () => reassignLeadManager(id, previousManagerId),
                    onUndone: invalidateAfterReassign,
                });
            } else {
                toast.success({ title });
            }
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
        onSuccess: async (_data, ids) => {
            await invalidateLeads();
            toastWithUndo({
                title: t("toasts.bulkDeleteSuccessTitle"),
                description: t("toasts.bulkDeleteSuccessDescription"),
                undo: () => Promise.all(ids.map((id) => restoreLead(id))),
                onUndone: invalidateLeads,
            });
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
    const detailsSource = detailsTarget ?? (linkedLeadId ? linkedLeadQuery.data ?? null : null);
    const detailsLead = detailsSource ? (leads.find((l) => l.id === detailsSource.id) ?? detailsSource) : null;

    // Once the toolbar changes a filter, the link's seed no longer describes
    // the list; drop it so a reload doesn't bring it back.
    const dropLinkSeed = () => {
        if (!searchParams.has("managerId") && !searchParams.has("status")) return;
        setSearchParams((prev) => {
            const params = new URLSearchParams(prev);
            params.delete("managerId");
            params.delete("status");
            return params;
        }, { replace: true });
    };

    const openDetails = (lead: Lead) => setDetailsTarget(lead);
    const closeDetails = () => {
        setDetailsTarget(null);
        if (linkedLeadId) {
            setSearchParams((prev) => {
                const params = new URLSearchParams(prev);
                params.delete("lead");
                return params;
            }, { replace: true });
        }
    };

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
                dropLinkSeed();
            },
            branchFilter,
            setBranchFilter: (value: string | "all") => {
                setBranchFilterState(value);
                setPage(1);
            },
            sourceFilter,
            setSourceFilter: (value: string | "all") => {
                setSourceFilterState(value);
                setPage(1);
            },
            managerFilter,
            setManagerFilter: (value: string | "all") => {
                setManagerFilterState(value);
                setMineOnlyState(false);
                setPage(1);
                dropLinkSeed();
            },
            mineOnly,
            setMineOnly: (value: boolean) => {
                setMineOnlyState(value);
                if (value) setManagerFilterState("all");
                setPage(1);
                dropLinkSeed();
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
            open: !!detailsLead,
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
                transferBranchMutation.mutate({ id: transferTarget.id, branchId, previousBranchId: transferTarget.branchId });
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
                reassignMutation.mutate({
                    id: reassignTarget.id,
                    managerId,
                    previousManagerId: reassignTarget.manager?.id ?? null,
                });
            },
        },
    };
}
