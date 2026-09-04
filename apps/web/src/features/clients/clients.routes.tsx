import {lazy} from "react";
import type {RouteObject} from "react-router-dom";
import {RoleGuard} from "@/features/auth/pages/role-guard";
import {FEATURE_ROLES} from "@/features/auth/access";

const ClientsPage = lazy(() => import("./pages/clients-page").then(m => ({ default: m.ClientsPage })));
const ClientDetailsPage = lazy(() => import("./pages/client-details-page").then(m => ({ default: m.ClientDetailsPage })));

export const clientsRoutes: RouteObject = {
    path: "clients",
    element: <RoleGuard allow={[...FEATURE_ROLES.clients]} />,
    children: [
        { index: true, element: <ClientsPage /> },
        { path: ":clientId", element: <ClientDetailsPage /> },
    ],
};