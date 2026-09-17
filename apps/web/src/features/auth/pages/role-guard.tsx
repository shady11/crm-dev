import {Navigate, Outlet} from "react-router-dom";
import {useAuth} from "@/features/auth/hooks/use-auth";
import {canAccess, landingPathFor, type Feature} from "@/features/auth/access";

export function RoleGuard({ feature }: { feature: Feature }) {
    const { user } = useAuth();

    if (!canAccess(user, feature)) {
        return <Navigate to={landingPathFor(user)} replace />;
    }

    return <Outlet />;
}
