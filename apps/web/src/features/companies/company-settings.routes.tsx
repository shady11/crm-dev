import {lazy} from "react";
import type {RouteObject} from "react-router-dom";
import {RoleGuard} from "@/features/auth/pages/role-guard";
import {FEATURE_ROLES} from "@/features/auth/access";

const CompanySettingsPage = lazy(() =>
    import("./pages/company-settings-page").then((m) => ({default: m.CompanySettingsPage})),
);

export const companySettingsRoutes: RouteObject = {
    path: "settings",
    element: <RoleGuard allow={[...FEATURE_ROLES.companySettings]} />,
    children: [{index: true, element: <CompanySettingsPage />}],
};
