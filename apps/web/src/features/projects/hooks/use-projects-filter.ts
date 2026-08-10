import {useQuery} from "@tanstack/react-query";
import {getProjects} from "@/features/projects/api/projects.api.ts";

export function useProjectsFilter() {
    const query = useQuery({
        queryKey: ["projects", "filter-options"],
        queryFn: () => getProjects({ limit: 100 }),
        staleTime: 5 * 60 * 1000,
    });

    return {
        ...query,
        data: query.data?.items ?? [],
    };
}