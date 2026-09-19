import {lazy} from "react";
import type {RouteObject} from "react-router-dom";
import {RoleGuard} from "@/features/auth/pages/role-guard";

const SuperAdminDashboardPage = lazy(() =>
    import("./pages/super-admin-dashboard-page").then((m) => ({default: m.SuperAdminDashboardPage})),
);

export const superAdminDashboardRoutes: RouteObject = {
    path: "super-admin-dashboard",
    element: <RoleGuard feature="superAdminDashboard" />,
    children: [{index: true, element: <SuperAdminDashboardPage />}],
};
