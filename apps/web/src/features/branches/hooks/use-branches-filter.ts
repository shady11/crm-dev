import {useQuery} from "@tanstack/react-query";
import {getBranches} from "../api/branches.api";

// Thin wrapper for populating a branch dropdown (user form, admin filters) —
// same shape as use-managers.ts / use-projects-filter.ts.
export function useBranchesFilter() {
    const query = useQuery({
        queryKey: ["branches", "filter"],
        queryFn: () => getBranches({includeDeactivated: false, limit: 100}),
        staleTime: 5 * 60 * 1000,
    });

    return {...query, data: query.data?.items ?? []};
}
