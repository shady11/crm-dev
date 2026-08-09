import {useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {toast} from "@/components/ui/toast.tsx";
import {
    type ConvertLeadPayload,
    convertLead,
    createLead,
    type CreateLeadPayload,
    deleteLead,
    getLeads,
    type Lead,
    updateLead,
    type UpdateLeadPayload,
} from "@/features/leads/api/leads.api.ts";
import type {LeadStatus} from "@/features/leads/types/lead.types.ts";

export type LeadStatusFilterValue = LeadStatus | "all";

export function useLeadsList() {
    const queryClient = useQueryClient();

    const [search, setSearchState] = useState("");
    const [statusFilter, setStatusFilterState] = useState<LeadStatusFilterValue>("all");
    const [page, setPage] = useState(1);
    const [limit, setLimitState] = useState(10);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const [formOpen, setFormOpen] = useState(false);
    const [editingLead, setEditingLead] = useState<Lead | null>(null);

    const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
    const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
    const [convertTarget, setConvertTarget] = useState<Lead | null>(null);
    const [detailsTarget, setDetailsTarget] = useState<Lead | null>(null);

    const tableQuery = useQuery({
        queryKey: ["leads", { search, statusFilter, page, limit }],
        queryFn: () =>
            getLeads({
                page,
                limit,
                search: search || undefined,
                status: statusFilter === "all" ? undefined : statusFilter,
            }),
    });

    const createMutation = useMutation({
        mutationFn: (payload: CreateLeadPayload) => createLead(payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["leads"] });
            toast.success({ title: "Successfully created", description: "The new lead has been added." });
            closeForm();
        },
        onError: () => {
            toast.error({ title: "Failed to create lead", description: "Please check the details and try again." });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: UpdateLeadPayload }) => updateLead(id, payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["leads"] });
            toast.success({ title: "Successfully updated", description: "The lead has been updated." });
            closeForm();
        },
        onError: () => {
            toast.error({ title: "Failed to update lead", description: "Please try again." });
        },
    });

    const convertMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: ConvertLeadPayload }) => convertLead(id, payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["leads"] });
            await queryClient.invalidateQueries({ queryKey: ["clients"] });
            toast.success({ title: "Lead converted", description: "The lead is now a client." });
            setConvertTarget(null);
        },
        onError: () => {
            toast.error({ title: "Failed to convert lead", description: "Please try again." });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteLead,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["leads"] });
            toast.success({ title: "Lead deleted", description: "The lead has been removed." });
            setDeleteTarget(null);
            setDetailsTarget(null);
        },
        onError: () => {
            toast.error({ title: "Failed to delete lead", description: "Please try again." });
        },
    });

    const bulkDeleteMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            const results = await Promise.allSettled(ids.map((id) => deleteLead(id)));
            const failed = results.filter((r) => r.status === "rejected").length;

            if (failed > 0) {
                throw new Error(
                    failed === ids.length
                        ? "None of the selected leads could be deleted."
                        : `${failed} of ${ids.length} selected leads could not be deleted.`,
                );
            }
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["leads"] });
            toast.success({ title: "Leads deleted", description: "Selected leads have been removed." });
            setSelectedIds(new Set());
            setBulkDeleteDialogOpen(false);
        },
        onError: async (error: Error) => {
            await queryClient.invalidateQueries({ queryKey: ["leads"] });
            toast.error({ title: "Bulk delete had issues", description: error.message });
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
        createMutation.reset();
        updateMutation.reset();
    };

    const handleSubmit = (payload: CreateLeadPayload | UpdateLeadPayload) => {
        if (editingLead) {
            updateMutation.mutate({ id: editingLead.id, payload: payload as UpdateLeadPayload });
            return;
        }
        createMutation.mutate(payload as CreateLeadPayload);
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
            hasError: createMutation.isError || updateMutation.isError,
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
        },
    };
}
