import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet } from "react-router-dom";
import { getAccessToken } from "@/lib/auth-storage.ts";
import { getMe } from "@/features/auth/api/auth-api.ts";
import { LoadingScreen } from "../shared/loading-screen";

export function ProtectedRoute() {
    const token = getAccessToken();

    const meQuery = useQuery({
        queryKey: ["auth", "me"],
        queryFn: getMe,
        enabled: Boolean(token),
        retry: false,
    });

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    if (meQuery.isLoading) {
        return <LoadingScreen />;
    }

    if (meQuery.isError) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}