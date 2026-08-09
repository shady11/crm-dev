import {lazy} from "react";
import type {RouteObject} from "react-router-dom";
import {RoleGuard} from "@/features/auth/pages/role-guard";
import {UserRole} from "@/features/users/types/user.types";

const TasksPage = lazy(() => import("./pages/tasks-page").then(m => ({ default: m.TasksPage })));

export const tasksRoutes: RouteObject = {
    path: "tasks",
    element: <RoleGuard allow={[UserRole.COMPANY_ADMIN, UserRole.SALES_HEAD, UserRole.SALES_MANAGER, UserRole.FINANCE]} />,
    children: [{ index: true, element: <TasksPage /> }],
};