import {lazy} from "react";
import {useAuth} from "@/features/auth/hooks/use-auth";
import {canManageUsers} from "@/features/auth/access";

const UsersPage = lazy(() => import("./users-page").then(m => ({ default: m.UsersPage })));
const TeamPage = lazy(() => import("./team-page").then(m => ({ default: m.TeamPage })));

// Someone who can only view users (a Sales Head) gets the read-only
// "My team" page instead of the admin screen, whose every action, and the
// branch and role lookups it loads, would be refused for them.
export function UsersIndexPage() {
    const { user } = useAuth();
    return canManageUsers(user) ? <UsersPage /> : <TeamPage />;
}
