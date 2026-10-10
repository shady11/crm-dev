import {useQuery} from "@tanstack/react-query";
import {getDocuments} from "@/features/documents/api/documents.api.ts";
import type {DocumentOwnerType} from "@/features/documents/types/document.types.ts";

/**
 * Documents attached to one record. For a client, `includeClientDeals` also
 * brings in the documents on each of the client's deals.
 */
export function useEntityDocuments(ownerType: DocumentOwnerType, ownerId: string, includeClientDeals = false) {
    const params = includeClientDeals && ownerType === "CLIENT"
        ? { clientId: ownerId }
        : { ownerType, ownerId };
    const query = useQuery({
        queryKey: ["documents", params],
        queryFn: () => getDocuments({ ...params, limit: 100 }),
    });
    return { ...query, documents: query.data?.items ?? [] };
}
