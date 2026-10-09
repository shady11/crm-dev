import {useQuery} from "@tanstack/react-query";
import {getSalesTeam} from "@/features/users/api/users.api";
import {useAuth} from "@/features/auth/hooks/use-auth";
import {hasPermission} from "@/features/auth/access";

/**
 * People a deal or lead can be assigned to, scoped by the API to the
 * caller's branch when the caller is branch-scoped. Skipped for users who
 * can see neither deals nor leads, since the endpoint would refuse them.
 */
export function useManagers() {
    const {user} = useAuth();
    const canRead = hasPermission(user, "deals.view") || hasPermission(user, "leads.view");

    const query = useQuery({
        queryKey: ["users", "sales-team"],
        queryFn: getSalesTeam,
        enabled: canRead,
        staleTime: 5 * 60 * 1000,
    });

    return {
        ...query,
        data: query.data ?? [],
    };
}
