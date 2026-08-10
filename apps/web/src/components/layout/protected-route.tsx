import {useQuery} from "@tanstack/react-query";
import {Navigate, Outlet} from "react-router-dom";
import {getMe} from "@/features/auth/api/auth.api";
import {LoadingScreen} from "../shared/loading-screen";
import {authStorage} from "@/features/auth/utils/auth-storage.ts";

export function ProtectedRoute() {
    const token = authStorage.getToken();

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