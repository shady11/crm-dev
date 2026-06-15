import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet } from "react-router-dom";
import { getMe } from "../api/auth.api";
import { authStorage } from "@/lib/auth-storage";

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
        return (
            <div className="min-h-screen flex items-center justify-center">
                Loading...
            </div>
        );
    }

    if (meQuery.isError) {
        authStorage.clear();
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}