import {useQuery} from "@tanstack/react-query";
import {getReservationPolicy} from "@/features/deals/api/deals.api";

export function useReservationPolicy(enabled = true) {
    return useQuery({
        queryKey: ["deals", "reservation-policy"],
        queryFn: getReservationPolicy,
        enabled,
        staleTime: 5 * 60 * 1000,
    });
}
