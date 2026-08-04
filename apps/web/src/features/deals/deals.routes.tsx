import {lazy} from "react";
import type {RouteObject} from "react-router-dom";
import {RoleGuard} from "@/features/auth/pages/role-guard";
import {UserRole} from "@/features/users/types/user.types";

const DealsPage = lazy(() => import("./pages/deals-page").then(m => ({ default: m.DealsPage })));
const DealDetailsPage = lazy(() => import("./pages/deal-details-page").then(m => ({ default: m.DealDetailsPage })));

export const dealsRoutes: RouteObject = {
    path: "deals",
    element: <RoleGuard allow={[UserRole.COMPANY_ADMIN, UserRole.SALES_HEAD, UserRole.SALES_MANAGER, UserRole.FINANCE]} />,
    children: [
        { index: true, element: <DealsPage /> },
        { path: ":dealId", element: <DealDetailsPage /> },
    ],
};