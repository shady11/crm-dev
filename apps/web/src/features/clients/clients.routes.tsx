import {lazy} from "react";
import type {RouteObject} from "react-router-dom";
import {RoleGuard} from "@/features/auth/pages/role-guard";

const ClientsPage = lazy(() => import("./pages/clients-page").then(m => ({ default: m.ClientsPage })));
const ClientDetailsPage = lazy(() => import("./pages/client-details-page").then(m => ({ default: m.ClientDetailsPage })));

export const clientsRoutes: RouteObject = {
    path: "clients",
    element: <RoleGuard feature="clients" />,
    children: [
        { index: true, element: <ClientsPage /> },
        { path: ":clientId", element: <ClientDetailsPage /> },
    ],
};