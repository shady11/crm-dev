import {lazy} from "react";
import type {RouteObject} from "react-router-dom";
import {RoleGuard} from "@/features/auth/pages/role-guard";

const PriceChangesPage = lazy(() => import("./pages/price-changes-page").then(m => ({ default: m.PriceChangesPage })));

export const priceChangesRoutes: RouteObject = {
    path: "price-changes",
    element: <RoleGuard feature="priceChanges" />,
    children: [{ index: true, element: <PriceChangesPage /> }],
};
