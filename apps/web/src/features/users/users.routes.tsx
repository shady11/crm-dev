import {lazy} from "react";
import type {RouteObject} from "react-router-dom";
import {RoleGuard} from "@/features/auth/pages/role-guard";
import {UserRole} from "@/features/users/types/user.types";

const UsersPage = lazy(() => import("./pages/users-page").then(m => ({ default: m.UsersPage })));

export const usersRoutes: RouteObject = {
    path: "users",
    element: <RoleGuard allow={[UserRole.COMPANY_ADMIN, UserRole.SALES_HEAD]} />,
    children: [{ index: true, element: <UsersPage /> }],
};