import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import { LoginPage } from "@/features/auth/pages/login-page";
import { ProtectedRoute } from "@/features/auth/pages/protected-route";
import { PlaceholderPage } from "@/components/shared/placeholder-page.tsx";
import {
    ChessboardBlocks,
    ChessboardEntrances,
    ChessboardMatrix,
    ProjectOverview, ProjectPage,
    ProjectsPage, ProjectStructure
} from "@/features/projects/pages";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <Navigate to="/projects" replace />,
    },
    {
        path: "/login",
        element: <LoginPage />,
    },
    {
        element: <ProtectedRoute />,
        children: [
            {
                path: "/",
                element: <AppLayout />,
                children: [
                    {
                        index: true,
                        element: <Navigate to="/projects" replace />,
                    },
                    {
                        path: "dashboard",
                        element: <PlaceholderPage title="Dashboard"/>,
                    },
                    {
                        path: "leads",
                        element: <PlaceholderPage title="Leads"/>,
                    },
                    {
                        path: "clients",
                        element: <PlaceholderPage title="Clients"/>,
                    },
                    {
                        path: "projects",
                        children: [
                            {
                                path: '',
                                element: <ProjectsPage />,
                            },
                            {
                                path: ':projectId',
                                element: <ProjectPage />,
                                children: [
                                    {
                                        path: "",
                                        children: [
                                            {
                                                index: true,
                                                element: <Navigate to="overview" replace />,
                                            },
                                            {
                                                path: "overview",
                                                element: <ProjectOverview />,
                                            },
                                            {
                                                path: "builder",
                                                element: <ProjectStructure />,
                                            },
                                            {
                                                path: "chessboard",
                                                children: [
                                                    {
                                                        index: true,
                                                        element: <ChessboardBlocks />,
                                                    },
                                                    {
                                                        path: ":blockId",
                                                        children: [
                                                            {
                                                                index: true,
                                                                element: <ChessboardEntrances />,
                                                            },
                                                            {
                                                                path: ":entranceId",
                                                                element: <ChessboardMatrix />,
                                                            },
                                                        ],
                                                    },
                                                ],
                                            },
                                            {
                                                path: "sales",
                                                element: <PlaceholderPage title="Sales" />,
                                            },
                                        ]
                                    }
                                ]
                            },
                        ],
                    },

                    {
                        path: "units",
                        element: <PlaceholderPage title="Units"/>,
                    },
                    {
                        path: "chessboard",
                        element: <PlaceholderPage title="Chessboard" />,
                    },
                ],
            },
        ],
    },
]);