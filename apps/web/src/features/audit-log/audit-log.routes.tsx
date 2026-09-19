import {lazy} from "react";
import type {RouteObject} from "react-router-dom";
import {RoleGuard} from "@/features/auth/pages/role-guard";

const AuditLogPage = lazy(() =>
    import("./pages/audit-log-page").then((m) => ({default: m.AuditLogPage})),
);
const LoginActivityPage = lazy(() =>
    import("./pages/login-activity-page").then((m) => ({default: m.LoginActivityPage})),
);

export const auditLogRoutes: RouteObject = {
    path: "audit-log",
    element: <RoleGuard feature="auditLog" />,
    children: [{index: true, element: <AuditLogPage />}],
};

// Separate from auditLogRoutes above: a different feature/permission
// (loginActivity / audit_log.view_own), reached by COMPANY_ADMIN, not the
// SUPER_ADMIN-only platform-wide audit log.
export const loginActivityRoutes: RouteObject = {
    path: "login-activity",
    element: <RoleGuard feature="loginActivity" />,
    children: [{index: true, element: <LoginActivityPage />}],
};
