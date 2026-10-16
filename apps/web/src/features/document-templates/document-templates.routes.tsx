import {lazy} from "react";
import type {RouteObject} from "react-router-dom";
import {RoleGuard} from "@/features/auth/pages/role-guard";

const DocumentTemplatesPage = lazy(() =>
    import("./pages/document-templates-page").then((m) => ({default: m.DocumentTemplatesPage})),
);

export const documentTemplatesRoutes: RouteObject = {
    path: "document-templates",
    element: <RoleGuard feature="documentTemplates" />,
    children: [{index: true, element: <DocumentTemplatesPage />}],
};
