import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import { LoginPage } from "@/features/auth/pages/login-page";
import { ProtectedRoute } from "@/features/auth/pages/protected-route";
import { ProjectsPage } from "@/features/projects/pages/projects-page";
import { PlaceholderPage } from "@/features/projects/pages/placeholder-page";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <Navigate to="/app/projects" replace />,
    },
    {
        path: "/login",
        element: <LoginPage />,
    },
    {
        element: <ProtectedRoute />,
        children: [
            {
                path: "/app",
                element: <AppLayout />,
                children: [
                    {
                        index: true,
                        element: <Navigate to="/app/projects" replace />,
                    },
                    {
                        path: "dashboard",
                        element: (
                            <PlaceholderPage
                                title="Dashboard"
                                description="Dashboard will be added later."
                            />
                        ),
                    },
                    {
                        path: "leads",
                        element: (
                            <PlaceholderPage
                                title="Leads"
                                description="Lead list and Kanban will be added next."
                            />
                        ),
                    },
                    {
                        path: "clients",
                        element: (
                            <PlaceholderPage
                                title="Clients"
                                description="Client database will be added next."
                            />
                        ),
                    },
                    {
                        path: "projects",
                        element: <ProjectsPage />,
                    },
                    {
                        path: "units",
                        element: (
                            <PlaceholderPage
                                title="Units"
                                description="Units inventory table will be added after projects."
                            />
                        ),
                    },
                ],
            },
        ],
    },
]);