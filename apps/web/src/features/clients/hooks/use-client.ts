import {useQuery} from "@tanstack/react-query";
import {getClient} from "@/features/clients/api/clients.api.ts";

export function useClient(clientId: string | undefined) {
    return useQuery({
        queryKey: ["client", clientId],
        queryFn: () => getClient(clientId!),
        enabled: !!clientId,
    });
}