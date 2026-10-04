import {useMutation, useQueryClient} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {toast} from "@/components/ui/toast.tsx";
import {
    deleteDocument,
    type Document,
    downloadDocument,
    restoreDocument,
    uploadDocument
} from "@/features/documents/api/documents.api.ts";
import type {DocumentOwnerType, DocumentType} from "@/features/documents/types/document.types.ts";
import {toastWithUndo} from "@/lib/undo-toast.ts";

export function useDocumentActions() {
    const { t } = useTranslation("documents");
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ["documents"] });

    const upload = useMutation({
        mutationFn: ({ file, ownerType, ownerId, type }: { file: File; ownerType: DocumentOwnerType; ownerId: string; type?: DocumentType }) =>
            uploadDocument(file, ownerType, ownerId, type),
        onSuccess: async () => { await invalidate(); toast.success({ title: t("toast.uploaded") }); },
        onError: () => toast.error({ title: t("toast.uploadError") }),
    });

    const remove = useMutation({
        mutationFn: (id: string) => deleteDocument(id),
        onSuccess: async (_data, id) => {
            await invalidate();
            toastWithUndo({ title: t("toast.deleted"), undo: () => restoreDocument(id), onUndone: invalidate });
        },
        onError: () => toast.error({ title: t("toast.deleteError") }),
    });

    const download = useMutation({
        mutationFn: (doc: Document) => downloadDocument(doc),
        onError: () => toast.error({ title: t("toast.downloadError") }),
    });

    return { upload, remove, download };
}