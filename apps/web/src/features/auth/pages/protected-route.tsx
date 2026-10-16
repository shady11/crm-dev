import {Navigate, Outlet, useLocation} from "react-router-dom";
import {authStorage} from "@/features/auth/utils/auth-storage.ts";
import {useAuth} from "../hooks/use-auth.ts";
import {Loader} from "lucide-react";
import {paths} from "@/routes/paths.ts";

export function ProtectedRoute() {
    const token = authStorage.getToken();

    const { isLoading, isAuthenticated, user } = useAuth();
    const location = useLocation();

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

    // SA-6: a password someone else set is replaced before anything else
    // (a platform admin viewing as the user is not held up).
    if (user?.mustChangePassword && !user.impersonation && location.pathname !== paths.changePassword) {
        return <Navigate to={paths.changePassword} replace />;
    }

    return <Outlet />;
}