import {Navigate, Outlet} from "react-router-dom";
import {useAuth} from "@/features/auth/hooks/use-auth";
import {hasPermission, landingPathFor} from "@/features/auth/access";

export function PermissionGuard({ permission }: { permission: string }) {
    const { user } = useAuth();

    if (!hasPermission(user, permission)) {
        return <Navigate to={landingPathFor(user?.role)} replace />;
    }

    return <Outlet />;
}
