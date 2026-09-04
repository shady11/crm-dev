import {Navigate, Outlet} from "react-router-dom";
import {useAuth} from "@/features/auth/hooks/use-auth";
import {landingPathFor} from "@/features/auth/access";
import type {UserRole} from "@/features/users/types/user.types";

export function RoleGuard({ allow }: { allow: UserRole[] }) {
    const { user } = useAuth();

    if (!user || !allow.includes(user.role)) {
        return <Navigate to={landingPathFor(user?.role)} replace />;
    }

    return <Outlet />;
}