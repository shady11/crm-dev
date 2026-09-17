import {lazy} from "react";
import type {RouteObject} from "react-router-dom";
import {RoleGuard} from "@/features/auth/pages/role-guard";

const ActivitiesPage = lazy(() =>
    import("./pages/activities-page").then((m) => ({default: m.ActivitiesPage})),
);

export const activitiesRoutes: RouteObject = {
    path: "activity-log",
    element: <RoleGuard feature="activities" />,
    children: [{index: true, element: <ActivitiesPage />}],
};
