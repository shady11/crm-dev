import {createBrowserRouter} from "react-router-dom";
import {AppLayout} from "@/components/layout/app-layout";
import {LoginPage} from "@/features/auth/pages/login-page";
import {ProtectedRoute} from "@/features/auth/pages/protected-route";
import {NotFoundPage} from "@/components/shared/not-found-page";
import {projectsRoutes} from "@/features/projects/projects.routes";
import {usersRoutes} from "@/features/users/users.routes";
import {paths} from "@/routes/paths";
import {LeadsPage} from "@/features/leads";
import {dealsRoutes} from "@/features/deals/deals.routes.tsx";
import {tasksRoutes} from "@/features/tasks/tasks.routes.tsx";
import {clientsRoutes} from "@/features/clients/clients.routes.tsx";
import {DashboardPage} from "@/features/dashboard/pages/dashboard-page.tsx";
import {companiesRoutes} from "@/features/companies/companies.routes";
import {auditLogRoutes} from "@/features/audit-log/audit-log.routes";
import {RoleLanding} from "@/features/auth/pages/role-landing";
import {RoleGuard} from "@/features/auth/pages/role-guard";
import {FEATURE_ROLES} from "@/features/auth/access";

export const router = createBrowserRouter([
    { path: paths.login, element: <LoginPage /> },
    {
        element: <ProtectedRoute />,
        children: [
            {
                path: "/",
                element: <AppLayout />,
                children: [
                    // Per-role, because a SUPER_ADMIN has no company and every
                    // tenant page 403s for them.
                    { index: true, element: <RoleLanding /> },
                    {
                        path: "dashboard",
                        element: <RoleGuard allow={[...FEATURE_ROLES.dashboard]} />,
                        children: [{ index: true, element: <DashboardPage /> }],
                    },
                    companiesRoutes,
                    auditLogRoutes,
                    {
                        path: "leads",
                        element: <RoleGuard allow={[...FEATURE_ROLES.leads]} />,
                        children: [{ index: true, element: <LeadsPage /> }],
                    },
                    clientsRoutes,
                    projectsRoutes,
                    dealsRoutes,
                    usersRoutes,
                    tasksRoutes,
                    { path: "*", element: <NotFoundPage /> },
                ],
            },
        ],
    },
    { path: "*", element: <NotFoundPage /> },
]);