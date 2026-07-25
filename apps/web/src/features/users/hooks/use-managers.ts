import {useQuery} from "@tanstack/react-query";
import {getUsers} from "@/features/users/api/users.api";

export function useManagers() {
    const query = useQuery({
        queryKey: ["users", "managers"],
        queryFn: () => getUsers({ role: "SALES_MANAGER" }),
        staleTime: 5 * 60 * 1000,
    });

    return {
        ...query,
        data: query.data?.items ?? [],
    };
}