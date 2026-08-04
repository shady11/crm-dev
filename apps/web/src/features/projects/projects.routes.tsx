import {lazy} from "react";
import {Navigate, type RouteObject} from "react-router-dom";

const ProjectsPage = lazy(() => import("./pages/projects-page").then(m => ({ default: m.ProjectsPage })));
const ProjectPage = lazy(() => import("./pages/project-page").then(m => ({ default: m.ProjectPage })));
const ProjectOverview = lazy(() => import("./pages/project-overview").then(m => ({ default: m.ProjectOverview })));
const ProjectStructure = lazy(() => import("./pages/project-structure").then(m => ({ default: m.ProjectStructure })));
const ChessboardBlocks = lazy(() => import("./pages/chessboard/chessboard-blocks").then(m => ({ default: m.ChessboardBlocks })));
const ChessboardEntrances = lazy(() => import("./pages/chessboard/chessboard-entrances").then(m => ({ default: m.ChessboardEntrances })));
const ChessboardMatrix = lazy(() => import("./pages/chessboard/chessboard-matrix").then(m => ({ default: m.ChessboardMatrix })));

export const projectsRoutes: RouteObject = {
    path: "projects",
    children: [
        { index: true, element: <ProjectsPage /> },
        {
            path: ":projectId",
            element: <ProjectPage />,
            children: [
                { index: true, element: <Navigate to="overview" replace /> },
                { path: "overview", element: <ProjectOverview /> },
                { path: "builder", element: <ProjectStructure /> },
                {
                    path: "chessboard",
                    children: [
                        { index: true, element: <ChessboardBlocks /> },
                        {
                            path: ":blockId",
                            children: [
                                { index: true, element: <ChessboardEntrances /> },
                                {
                                    path: ":entranceId",
                                    children: [
                                        { index: true, element: <ChessboardMatrix /> },
                                    ],
                                },
                            ],
                        },
                    ],
                },
                { path: "sales", element: <div>Sales (coming soon)</div> },
            ],
        },
    ],
};