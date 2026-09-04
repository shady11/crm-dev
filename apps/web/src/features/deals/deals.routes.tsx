import {lazy} from "react";
import type {RouteObject} from "react-router-dom";
import {RoleGuard} from "@/features/auth/pages/role-guard";
import {FEATURE_ROLES} from "@/features/auth/access";

const DealsPage = lazy(() => import("./pages/deals-page").then(m => ({ default: m.DealsPage })));
const DealDetailsPage = lazy(() => import("./pages/deal-details-page").then(m => ({ default: m.DealDetailsPage })));

export const dealsRoutes: RouteObject = {
    path: "deals",
    element: <RoleGuard allow={[...FEATURE_ROLES.deals]} />,
    children: [
        { index: true, element: <DealsPage /> },
        { path: ":dealId", element: <DealDetailsPage /> },
    ],
};