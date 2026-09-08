import {lazy} from "react";
import type {RouteObject} from "react-router-dom";
import {RoleGuard} from "@/features/auth/pages/role-guard";
import {FEATURE_ROLES} from "@/features/auth/access";

const SettingOptionsPage = lazy(() =>
    import("./pages/setting-options-page").then((m) => ({default: m.SettingOptionsPage})),
);

export const settingOptionsRoutes: RouteObject = {
    path: "setting-options",
    element: <RoleGuard allow={[...FEATURE_ROLES.settingOptions]} />,
    children: [{index: true, element: <SettingOptionsPage />}],
};
