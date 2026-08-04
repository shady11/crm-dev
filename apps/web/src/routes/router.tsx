import {createBrowserRouter, Navigate} from "react-router-dom";
import {AppLayout} from "@/components/layout/app-layout";
import {LoginPage} from "@/features/auth/pages/login-page";
import {ProtectedRoute} from "@/features/auth/pages/protected-route";
import {NotFoundPage} from "@/components/shared/not-found-page";
import {PlaceholderPage} from "@/components/shared/placeholder-page.tsx";
import {projectsRoutes} from "@/features/projects/projects.routes";
import {usersRoutes} from "@/features/users/users.routes";
import {paths} from "@/routes/paths";
import {ClientsPage} from "@/features/clients";
import {dealsRoutes} from "@/features/deals/deals.routes.tsx";

export const router = createBrowserRouter([
    { path: paths.home, element: <Navigate to={paths.projects.root} replace /> },
    { path: paths.login, element: <LoginPage /> },
    {
        element: <ProtectedRoute />,
        children: [
            {
                path: "/",
                element: <AppLayout />,
                children: [
                    { index: true, element: <Navigate to={paths.projects.root} replace /> },
                    { path: "dashboard", element: <PlaceholderPage title="Dashboard" /> },
                    { path: "leads", element: <PlaceholderPage title="Leads" /> },
                    { path: "clients", element: <ClientsPage /> },
                    projectsRoutes,
                    dealsRoutes,
                    usersRoutes,
                    { path: "*", element: <NotFoundPage /> },
                ],
            },
        ],
    },
    { path: "*", element: <NotFoundPage /> },
]);