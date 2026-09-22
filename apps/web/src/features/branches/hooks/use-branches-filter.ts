import {useQuery} from "@tanstack/react-query";
import {getBranches} from "../api/branches.api";

// Thin wrapper for populating a branch dropdown (user form, admin filters) —
// same shape as use-managers.ts / use-projects-filter.ts. `enabled` defaults
// to true for existing callers (branches.view-gated forms) that already know
// they only render for a user who can call GET /branches; a caller that
// isn't sure (e.g. a filter shown regardless of role) must pass it
// explicitly — otherwise the query fires before any permission check a
// caller does on the returned data, not before it.
export function useBranchesFilter(enabled = true) {
    const query = useQuery({
        queryKey: ["branches", "filter"],
        queryFn: () => getBranches({includeDeactivated: false, limit: 100}),
        staleTime: 5 * 60 * 1000,
        enabled,
    });

    return {...query, data: query.data?.items ?? []};
}
