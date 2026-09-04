import {lazy} from "react";
import type {RouteObject} from "react-router-dom";
import {RoleGuard} from "@/features/auth/pages/role-guard";
import {FEATURE_ROLES} from "@/features/auth/access";

const UsersPage = lazy(() => import("./pages/users-page").then(m => ({ default: m.UsersPage })));

export const usersRoutes: RouteObject = {
    path: "users",
    element: <RoleGuard allow={[...FEATURE_ROLES.users]} />,
    children: [{ index: true, element: <UsersPage /> }],
};