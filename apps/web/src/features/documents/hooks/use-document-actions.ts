import {useMutation, useQueryClient} from "@tanstack/react-query";
import {toast} from "@/components/ui/toast.tsx";
import {
    deleteDocument,
    type Document,
    downloadDocument,
    uploadDocument
} from "@/features/documents/api/documents.api.ts";
import type {DocumentOwnerType, DocumentType} from "@/features/documents/types/document.types.ts";

export function useDocumentActions() {
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ["documents"] });

    const upload = useMutation({
        mutationFn: ({ file, ownerType, ownerId, type }: { file: File; ownerType: DocumentOwnerType; ownerId: string; type?: DocumentType }) =>
            uploadDocument(file, ownerType, ownerId, type),
        onSuccess: async () => { await invalidate(); toast.success({ title: "Document uploaded" }); },
        onError: () => toast.error({ title: "Failed to upload document" }),
    });

    const remove = useMutation({
        mutationFn: (id: string) => deleteDocument(id),
        onSuccess: async () => { await invalidate(); toast.success({ title: "Document deleted" }); },
        onError: () => toast.error({ title: "Failed to delete document" }),
    });

    const download = useMutation({
        mutationFn: (doc: Document) => downloadDocument(doc),
        onError: () => toast.error({ title: "Failed to download document" }),
    });

    return { upload, remove, download };
}