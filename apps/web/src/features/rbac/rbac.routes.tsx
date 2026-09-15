import {lazy} from "react";
import type {RouteObject} from "react-router-dom";
import {PermissionGuard} from "@/features/auth/pages/permission-guard";

const RolesPermissionsPage = lazy(() =>
    import("./pages/roles-permissions-page").then((m) => ({default: m.RolesPermissionsPage})),
);

export const rbacRoutes: RouteObject = {
    path: "roles-permissions",
    element: <PermissionGuard permission="rbac.manage" />,
    children: [{index: true, element: <RolesPermissionsPage />}],
};
