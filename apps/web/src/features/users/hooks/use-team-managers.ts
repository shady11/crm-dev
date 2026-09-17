import {useQuery} from "@tanstack/react-query";
import {getUsers} from "@/features/users/api/users.api.ts";
import {getRoles} from "@/features/rbac/api/rbac.api.ts";

const SALES_MANAGER_ROLE_NAME = "Sales Manager";

// SH-A1: candidates for the "reassign to" picker — active Sales Managers on
// the given branch, matching what the backend's reassign endpoints actually
// allow. Disabled until a branchId is known.
export function useTeamManagers(branchId?: string | null) {
    const rolesQuery = useQuery({ queryKey: ["rbac", "roles"], queryFn: getRoles });
    const salesManagerRoleId = rolesQuery.data?.find((role) => role.name === SALES_MANAGER_ROLE_NAME)?.id;

    const query = useQuery({
        queryKey: ["users", "team-managers", branchId, salesManagerRoleId],
        queryFn: () => getUsers({ limit: 100, roleId: salesManagerRoleId, isActive: true }),
        enabled: !!branchId && !!salesManagerRoleId,
        staleTime: 5 * 60 * 1000,
    });

    const items = (query.data?.items ?? []).filter((candidate) => candidate.branchId === branchId);
    return { ...query, data: items };
}
