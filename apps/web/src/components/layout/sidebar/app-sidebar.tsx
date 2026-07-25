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
import {useAuth} from "@/features/auth/hooks/use-auth.ts";
import {Box, Building2, GalleryVerticalEnd, Handshake, LayoutDashboard, SettingsIcon, Users} from "lucide-react";

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
            icon: Handshake,
        },
        {
            title: "Projects",
            url: "/projects",
            icon: Building2,
        },
        {
            title: "Users",
            url: "/users",
            icon: Users,
        },
        {
            title: "Settings",
            url: "/settings",
            icon: SettingsIcon,
        },
    ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {

    const { user } = useAuth();

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
                                    <span className="font-semibold">CRM Dev</span>
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

            {/*<SidebarRail />*/}
        </Sidebar>
    )
}
