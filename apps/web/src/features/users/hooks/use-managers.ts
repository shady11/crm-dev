import {useQuery} from "@tanstack/react-query";
import {getUsers} from "@/features/users/api/users.api";
import {getRoles} from "@/features/rbac/api/rbac.api";

const SALES_MANAGER_ROLE_NAME = "Sales Manager";

export function useManagers() {
    const rolesQuery = useQuery({ queryKey: ["rbac", "roles"], queryFn: getRoles });
    const salesManagerRoleId = rolesQuery.data?.find((role) => role.name === SALES_MANAGER_ROLE_NAME)?.id;

    const query = useQuery({
        queryKey: ["users", "managers", salesManagerRoleId],
        queryFn: () => getUsers({ roleId: salesManagerRoleId }),
        enabled: !!salesManagerRoleId,
        staleTime: 5 * 60 * 1000,
    });

    return {
        ...query,
        data: query.data?.items ?? [],
    };
}
