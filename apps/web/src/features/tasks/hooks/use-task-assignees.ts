import {useQuery} from "@tanstack/react-query";
import {getSalesTeam, getUsers} from "@/features/users/api/users.api.ts";
import {useAuth} from "@/features/auth/hooks/use-auth.ts";
import {hasPermission} from "@/features/auth/access.ts";

/**
 * People a task can be assigned to: everyone in the company for users who
 * can list users, otherwise (e.g. Finance) the sales team, which anyone
 * working leads or deals may read. GET /users alone left Finance with an
 * empty assignee list.
 */
export function useTaskAssignees() {
    const {user} = useAuth();
    const canListUsers = hasPermission(user, "users.view");

    const query = useQuery({
        queryKey: ["users", "task-assignees", canListUsers],
        queryFn: async (): Promise<{id: string; fullName: string}[]> =>
            canListUsers ? (await getUsers({limit: 100})).items : getSalesTeam(),
        staleTime: 5 * 60 * 1000,
    });
    return {...query, data: query.data ?? []};
}
