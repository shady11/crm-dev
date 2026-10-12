import {lazy} from "react";
import type {RouteObject} from "react-router-dom";
import {RoleGuard} from "@/features/auth/pages/role-guard";

const UsersIndexPage = lazy(() => import("./pages/users-index-page").then(m => ({ default: m.UsersIndexPage })));

export const usersRoutes: RouteObject = {
    path: "users",
    element: <RoleGuard feature="users" />,
    children: [{ index: true, element: <UsersIndexPage /> }],
};
