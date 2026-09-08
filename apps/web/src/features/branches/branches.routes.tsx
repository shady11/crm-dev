import {lazy} from "react";
import type {RouteObject} from "react-router-dom";
import {RoleGuard} from "@/features/auth/pages/role-guard";
import {FEATURE_ROLES} from "@/features/auth/access";

const BranchesPage = lazy(() =>
    import("./pages/branches-page").then((m) => ({default: m.BranchesPage})),
);

export const branchesRoutes: RouteObject = {
    path: "branches",
    element: <RoleGuard allow={[...FEATURE_ROLES.branches]} />,
    children: [{index: true, element: <BranchesPage />}],
};
