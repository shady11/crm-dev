import {useQuery} from "@tanstack/react-query";
import {getMe} from "../api/auth.api";
import {authStorage} from "@/features/auth/utils/auth-storage.ts";

export function useAuth() {
    const token = authStorage.getToken();

    const query = useQuery({
        queryKey: ["auth", "me"],
        queryFn: getMe,
        enabled: !!token,
        staleTime: 1000 * 60 * 10, // 10 min
    });

    return {
        user: query.data,
        isLoading: query.isLoading,
        isAuthenticated: !!query.data,
    };
}