import {api} from "@/lib/api";
import type {PaginatedResponse} from "@/lib/api-types.ts";
import type {DocumentOwnerType, DocumentType} from "@/features/documents/types/document.types.ts";

export type Document = {
    id: string;
    name: string;
    originalName: string;
    mimeType: string;
    extension: string;
    size: number;
    type: DocumentType;
    ownerType: DocumentOwnerType;
    ownerId: string;
    createdAt: string;
    uploadedBy: { id: string; fullName: string };
};

export type GetDocumentsParams = {
    ownerType?: DocumentOwnerType;
    ownerId?: string;
    type?: DocumentType;
    search?: string;
    page?: number;
    limit?: number;
};

export async function getDocuments(params?: GetDocumentsParams) {
    const response = await api.get<PaginatedResponse<Document>>("/documents", { params });
    return response.data;
}

export async function uploadDocument(file: File, ownerType: DocumentOwnerType, ownerId: string, type?: DocumentType) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("ownerType", ownerType);
    formData.append("ownerId", ownerId);
    if (type) formData.append("type", type);

    const response = await api.post<Document>("/documents", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
}

export async function deleteDocument(id: string) {
    await api.delete(`/documents/${id}`);
}

export async function downloadDocument(doc: Document) {
    const response = await api.get(`/documents/${doc.id}/download`, { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = window.document.createElement("a");
    link.href = url;
    link.download = doc.originalName;
    window.document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
}