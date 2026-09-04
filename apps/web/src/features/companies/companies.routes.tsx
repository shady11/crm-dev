import {lazy} from "react";
import type {RouteObject} from "react-router-dom";
import {RoleGuard} from "@/features/auth/pages/role-guard";
import {FEATURE_ROLES} from "@/features/auth/access";

const CompaniesPage = lazy(() =>
    import("./pages/companies-page").then((m) => ({default: m.CompaniesPage})),
);
const CompanyDetailPage = lazy(() =>
    import("./pages/company-detail-page").then((m) => ({default: m.CompanyDetailPage})),
);

export const companiesRoutes: RouteObject = {
    path: "companies",
    element: <RoleGuard allow={[...FEATURE_ROLES.companies]} />,
    children: [
        {index: true, element: <CompaniesPage />},
        {path: ":companyId", element: <CompanyDetailPage />},
    ],
};
