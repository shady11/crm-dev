import {useQuery} from "@tanstack/react-query";
import {getDeals} from "@/features/deals/api/deals.api";
import type {DealStatus} from "@/features/deals/types/deal.types";

export function useDeals(filters: { status?: DealStatus; projectId?: string; clientId?: string; managerId?: string }) {
    return useQuery({
        queryKey: ["deals", filters],
        queryFn: () => getDeals(filters),
    });
}