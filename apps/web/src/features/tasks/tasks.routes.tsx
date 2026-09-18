import {lazy} from "react";
import type {RouteObject} from "react-router-dom";
import {RoleGuard} from "@/features/auth/pages/role-guard";

const TasksPage = lazy(() => import("./pages/tasks-page").then(m => ({ default: m.TasksPage })));

export const tasksRoutes: RouteObject = {
    path: "tasks",
    element: <RoleGuard feature="tasks" />,
    children: [{ index: true, element: <TasksPage /> }],
};