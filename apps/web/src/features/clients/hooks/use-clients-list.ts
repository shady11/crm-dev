import {useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {toast} from "@/components/ui/toast.tsx";
import {
    createClient,
    type CreateClientPayload,
    deleteClient,
    getClients,
    updateClient,
    type UpdateClientPayload,
} from "@/features/clients/api/clients.api.ts";
import type {Client} from "@/features/clients/types/client.types";
import {useTranslation} from "react-i18next";

export type ProjectFilterValue = string | "all";

export function useClientsList() {
    const { t } = useTranslation("clients");
    const queryClient = useQueryClient();

    const [search, setSearchState] = useState("");
    const [projectFilter, setProjectFilterState] = useState<ProjectFilterValue>("all");
    const [page, setPage] = useState(1);
    const [limit, setLimitState] = useState(10);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const [formOpen, setFormOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);

    const tableQuery = useQuery({
        queryKey: ["clients", { search, projectFilter, page, limit }],
        queryFn: () =>
            getClients({
                page,
                limit,
                search: search || undefined,
                projectId: projectFilter === "all" ? undefined : projectFilter,
            }),
    });

    const createMutation = useMutation({
        mutationFn: (payload: CreateClientPayload) => createClient(payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["clients"] });
            toast.success({ title: t("toasts.createSuccessTitle"), description: t("toasts.createSuccessDescription") });
            closeForm();
        },
        onError: () => {
            toast.error({ title: t("toasts.createErrorTitle"), description: t("toasts.createErrorDescription") });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: UpdateClientPayload }) => updateClient(id, payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["clients"] });
            toast.success({ title: t("detail.updateSuccessTitle"), description: t("detail.updateSuccessDescription") });
            closeForm();
        },
        onError: () => {
            toast.error({ title: t("detail.updateErrorTitle"), description: t("detail.updateErrorDescription") });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteClient,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["clients"] });
            toast.success({ title: t("toasts.deleteSuccessTitle"), description: t("toasts.deleteSuccessDescription") });
        },
        onError: () => {
            toast.error({ title: t("toasts.deleteErrorTitle"), description: t("toasts.deleteErrorDescription") });
        },
    });

    const bulkDeleteMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            const results = await Promise.allSettled(ids.map((id) => deleteClient(id)));
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
            await queryClient.invalidateQueries({ queryKey: ["clients"] });
            toast.success({ title: t("toasts.bulkDeleteSuccessTitle"), description: t("toasts.bulkDeleteSuccessDescription") });
            setSelectedIds(new Set());
        },
        onError: async (error: Error) => {
            await queryClient.invalidateQueries({ queryKey: ["clients"] });
            toast.error({ title: t("toasts.bulkDeleteIssuesTitle"), description: error.message });
            setSelectedIds(new Set());
        },
    });

    const clearSelection = () => setSelectedIds(new Set());

    const openCreateForm = () => {
        setEditingClient(null);
        setFormOpen(true);
    };

    const openEditForm = (client: Client) => {
        setEditingClient(client);
        setFormOpen(true);
    };

    const closeForm = () => {
        setFormOpen(false);
        setEditingClient(null);
        createMutation.reset();
        updateMutation.reset();
    };

    const handleSubmit = (payload: CreateClientPayload | UpdateClientPayload) => {
        if (editingClient) {
            updateMutation.mutate({ id: editingClient.id, payload: payload as UpdateClientPayload });
            return;
        }
        createMutation.mutate(payload as CreateClientPayload);
    };

    const toggleSelectAll = (checked: boolean) => {
        if (!checked) {
            setSelectedIds(new Set());
            return;
        }
        setSelectedIds(new Set((tableQuery.data?.items ?? []).map((c) => c.id)));
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

    const clients = tableQuery.data?.items ?? [];
    const meta = tableQuery.data?.meta;
    const allSelected = clients.length > 0 && selectedIds.size === clients.length;

    return {
        filters: {
            search,
            setSearch: (value: string) => {
                setSearchState(value);
                setPage(1);
            },
            projectFilter,
            setProjectFilter: (value: ProjectFilterValue) => {
                setProjectFilterState(value);
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
            clients,
            isLoading: tableQuery.isLoading,
        },

        selection: {
            selectedIds,
            allSelected,
            toggleSelectAll,
            toggleSelectOne,
            clear: clearSelection,
            bulkDelete: () => bulkDeleteMutation.mutate(Array.from(selectedIds)),
            isBulkDeleting: bulkDeleteMutation.isPending,
        },

        form: {
            open: formOpen,
            editingClient,
            isSubmitting: createMutation.isPending || updateMutation.isPending,
            hasError: createMutation.isError || updateMutation.isError,
            openCreateForm,
            openEditForm,
            closeForm,
            handleSubmit,
        },

        actions: {
            deleteClient: (id: string) => deleteMutation.mutate(id),
            isDeleting: (id: string) => deleteMutation.isPending && deleteMutation.variables === id,
        },
    };
}