import {useQuery} from "@tanstack/react-query";
import {getUsers} from "@/features/users/api/users.api.ts";

export function useAssignableUsers() {
    const query = useQuery({
        queryKey: ["users", "assignable"],
        queryFn: () => getUsers({ limit: 100 }),
        staleTime: 5 * 60 * 1000,
    });
    return { ...query, data: query.data?.items ?? [] };
}