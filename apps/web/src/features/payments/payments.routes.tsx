import {lazy} from "react";
import type {RouteObject} from "react-router-dom";
import {RoleGuard} from "@/features/auth/pages/role-guard";

const PaymentsPage = lazy(() => import("./pages/payments-page").then(m => ({ default: m.PaymentsPage })));

export const paymentsRoutes: RouteObject = {
    path: "payments",
    element: <RoleGuard feature="payments" />,
    children: [{ index: true, element: <PaymentsPage /> }],
};
