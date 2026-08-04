import {useQuery} from "@tanstack/react-query";
import {getUnit} from "@/features/units/api/units.api";

export function useUnit(unitId: string | undefined) {
    return useQuery({
        queryKey: ["unit", unitId],
        queryFn: () => getUnit(unitId!),
        enabled: !!unitId,
    });
}