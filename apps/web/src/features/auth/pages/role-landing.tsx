import {Navigate} from "react-router-dom";
import {useAuth} from "@/features/auth/hooks/use-auth";
import {landingPathFor} from "@/features/auth/access";

/**
 * Sends each role to a page it can actually open. Previously the index route
 * redirected everyone to /projects, which a SUPER_ADMIN cannot load — they
 * belong to no company, so CompanyGuard rejects every request that page makes.
 */
export function RoleLanding() {
    const {user} = useAuth();

    return <Navigate to={landingPathFor(user?.role)} replace />;
}
