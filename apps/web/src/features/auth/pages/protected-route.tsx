import {Navigate, Outlet} from "react-router-dom";
import {authStorage} from "@/features/auth/utils/auth-storage.ts";
import {useAuth} from "../hooks/use-auth.ts";
import {Loader} from "lucide-react";

export function ProtectedRoute() {
    const token = authStorage.getToken();

    const { isLoading, isAuthenticated } = useAuth();

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader size={32} className="animate-spin"/>
            </div>
        );
    }

    if (!isAuthenticated) {
        authStorage.clear();
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}