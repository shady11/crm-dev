import {useQuery} from "@tanstack/react-query";
import {getDocuments} from "@/features/documents/api/documents.api.ts";
import type {DocumentOwnerType} from "@/features/documents/types/document.types.ts";

export function useEntityDocuments(ownerType: DocumentOwnerType, ownerId: string) {
    const query = useQuery({
        queryKey: ["documents", { ownerType, ownerId }],
        queryFn: () => getDocuments({ ownerType, ownerId, limit: 50 }),
    });
    return { ...query, documents: query.data?.items ?? [] };
}