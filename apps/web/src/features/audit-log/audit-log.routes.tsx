import {lazy} from "react";
import type {RouteObject} from "react-router-dom";
import {RoleGuard} from "@/features/auth/pages/role-guard";

const AuditLogPage = lazy(() =>
    import("./pages/audit-log-page").then((m) => ({default: m.AuditLogPage})),
);

export const auditLogRoutes: RouteObject = {
    path: "audit-log",
    element: <RoleGuard feature="auditLog" />,
    children: [{index: true, element: <AuditLogPage />}],
};
