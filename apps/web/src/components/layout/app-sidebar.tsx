import * as React from "react"

import { NavMain } from "@/components/layout/sidebar/nav-main"
import { NavUser } from "@/components/layout/sidebar/nav-user"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
    SidebarRail,
} from "@/components/ui/sidebar.tsx"
import {useAuth} from "@/features/auth/hooks/useAuth.ts";
import {Box, Building2, GalleryVerticalEnd, LayoutDashboard, SettingsIcon, UsersRound} from "lucide-react";

const data = {
    navMain: [
        {
            title: "Dashboard",
            url: "/dashboard",
            icon: LayoutDashboard,
        },
        {
            title: "Leads",
            url: "/leads",
            icon: GalleryVerticalEnd,
        },
        {
            title: "Clients",
            url: "/clients",
            icon: UsersRound,
        },
        {
            title: "Projects",
            url: "/projects",
            icon: Building2,
        },
        {
            title: "Administration",
            url: "#",
            icon: SettingsIcon,
            items: [
                {
                    title: "Users",
                    url: "/users",
                },
                {
                    title: "Settings",
                    url: "/settings",
                },
            ],
        },
    ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {

    const { user } = useAuth();

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <a href="/dashboard">
                                <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                                    <Box />
                                </div>

                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="font-medium">CRM Dev</span>
                                    <span className="text-xs text-muted-foreground">
                                        Real Estate CRM
                                      </span>
                                </div>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={data.navMain} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser user={{
                    name: user?.name ?? "Loading...",
                    email: user?.email ?? "",
                    avatar: "/"
                }} />
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    )
}
