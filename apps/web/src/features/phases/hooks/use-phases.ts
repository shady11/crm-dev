import {useQuery} from "@tanstack/react-query";
import {getPhases} from "@/features/phases/api/phases.api.ts";

export function usePhases(projectId: string | undefined) {
    const query = useQuery({
        queryKey: ["phases", projectId],
        queryFn: () => getPhases(projectId!),
        enabled: !!projectId,
    });
    return {...query, phases: query.data ?? []};
}
