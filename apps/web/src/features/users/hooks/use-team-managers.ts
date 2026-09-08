import {useQuery} from "@tanstack/react-query";
import {getUsers} from "@/features/users/api/users.api.ts";
import {UserRole} from "@/features/users/types/user.types.ts";

// SH-A1: candidates for the "reassign to" picker — active SALES_MANAGERs on
// the given branch, matching what the backend's reassign endpoints actually
// allow. Disabled until a branchId is known.
export function useTeamManagers(branchId?: string | null) {
    const query = useQuery({
        queryKey: ["users", "team-managers", branchId],
        queryFn: () => getUsers({ limit: 100, role: UserRole.SALES_MANAGER, isActive: true }),
        enabled: !!branchId,
        staleTime: 5 * 60 * 1000,
    });

    const items = (query.data?.items ?? []).filter((candidate) => candidate.branchId === branchId);
    return { ...query, data: items };
}
