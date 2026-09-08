import * as React from "react"

import {NavMain} from "@/components/layout/sidebar/nav-main.tsx"
import {NavUser} from "@/components/layout/sidebar/nav-user.tsx"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar.tsx"
import {useTranslation} from "react-i18next";
import {useAuth} from "@/features/auth/hooks/use-auth.ts";
import {canAccess, type Feature} from "@/features/auth/access";
import {
    Box,
    Building2,
    GalleryVerticalEnd,
    Landmark,
    Handshake,
    LayoutDashboard,
    ListTodo,
    ScrollText,
    SquareUser,
    Users
} from "lucide-react";

// titleKey resolves against the "common" namespace via t() below - kept as a
// key rather than the label itself so NavMain never renders an un-translated
// English string regardless of which language is active.
const NAV_ITEMS: {
    titleKey: string;
    feature: Feature;
    url: string;
    icon: typeof LayoutDashboard;
}[] = [
    { titleKey: "nav.dashboard", feature: "dashboard", url: "/dashboard", icon: LayoutDashboard },
    { titleKey: "nav.leads", feature: "leads", url: "/leads", icon: GalleryVerticalEnd },
    { titleKey: "nav.tasks", feature: "tasks", url: "/tasks", icon: ListTodo },
    { titleKey: "nav.clients", feature: "clients", url: "/clients", icon: SquareUser },
    { titleKey: "nav.deals", feature: "deals", url: "/deals", icon: Handshake },
    { titleKey: "nav.projects", feature: "projects", url: "/projects", icon: Building2 },
    { titleKey: "nav.companies", feature: "companies", url: "/companies", icon: Landmark },
    { titleKey: "nav.users", feature: "users", url: "/users", icon: Users },
    { titleKey: "nav.auditLog", feature: "auditLog", url: "/audit-log", icon: ScrollText },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {

    const { t } = useTranslation("common");
    const { user } = useAuth();

    const navMain = NAV_ITEMS
        .filter((item) => canAccess(user?.role, item.feature))
        .map((item) => ({ title: t(item.titleKey), url: item.url, icon: item.icon }));

    return (
        <Sidebar className="h-full border-r-2" collapsible="icon" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <a href="/dashboard">
                                <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                                    <Box />
                                </div>

                                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                                    <span className="font-semibold">{t("nav.brandName")}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {t("nav.brandTagline")}
                                      </span>
                                </div>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                {/* Filtered by role so nobody is offered a link that RoleGuard
                    will bounce them straight back from. */}
                <NavMain items={navMain} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser user={{
                    name: user?.name ?? t("labels.loading"),
                    email: user?.email ?? "",
                    avatar: "/"
                }} />
            </SidebarFooter>

            {/*<SidebarRail />*/}
        </Sidebar>
    )
}
