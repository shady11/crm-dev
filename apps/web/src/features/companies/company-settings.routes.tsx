import {lazy} from "react";
import type {RouteObject} from "react-router-dom";
import {RoleGuard} from "@/features/auth/pages/role-guard";

const CompanySettingsPage = lazy(() =>
    import("./pages/company-settings-page").then((m) => ({default: m.CompanySettingsPage})),
);

export const companySettingsRoutes: RouteObject = {
    path: "settings",
    element: <RoleGuard feature="companySettings" />,
    children: [{index: true, element: <CompanySettingsPage />}],
};
