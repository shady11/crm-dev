import {lazy} from "react";
import type {RouteObject} from "react-router-dom";
import {RoleGuard} from "@/features/auth/pages/role-guard";

const RolesPermissionsPage = lazy(() =>
    import("./pages/roles-permissions-page").then((m) => ({default: m.RolesPermissionsPage})),
);

export const rbacRoutes: RouteObject = {
    path: "roles-permissions",
    element: <RoleGuard feature="rolesPermissions" />,
    children: [{index: true, element: <RolesPermissionsPage />}],
};
