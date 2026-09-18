import {lazy} from "react";
import type {RouteObject} from "react-router-dom";
import {RoleGuard} from "@/features/auth/pages/role-guard";

const BranchesPage = lazy(() =>
    import("./pages/branches-page").then((m) => ({default: m.BranchesPage})),
);
const BranchDetailPage = lazy(() =>
    import("./pages/branch-detail-page").then((m) => ({default: m.BranchDetailPage})),
);

export const branchesRoutes: RouteObject = {
    path: "branches",
    element: <RoleGuard feature="branches" />,
    children: [
        {index: true, element: <BranchesPage />},
        {path: ":branchId", element: <BranchDetailPage />},
    ],
};
