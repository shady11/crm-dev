import {useQuery} from "@tanstack/react-query";
import {getDeal} from "@/features/deals/api/deals.api";

export function useDeal(dealId: string | undefined) {
    return useQuery({
        queryKey: ["deal", dealId],
        queryFn: () => getDeal(dealId!),
        enabled: !!dealId,
    });
}