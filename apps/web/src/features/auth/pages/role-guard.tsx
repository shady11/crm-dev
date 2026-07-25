import {Navigate, Outlet} from "react-router-dom";
import {useAuth} from "@/features/auth/hooks/use-auth";
import type {UserRole} from "@/features/users/types/user.types";

export function RoleGuard({ allow }: { allow: UserRole[] }) {
    const { user } = useAuth();

    if (!user || !allow.includes(user.role)) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
}