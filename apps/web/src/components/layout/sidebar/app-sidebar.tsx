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
import {canAccess, type Feature} from "@/features/auth/access";
import {
    Box,
    Building2,
    GalleryVerticalEnd,
    Landmark,
    Handshake,
    LayoutDashboard,
    ListTodo,
    SquareUser,
    Users
} from "lucide-react";

const data = {
    navMain: [
        {
            title: "Dashboard",
            feature: "dashboard" as Feature,
            url: "/dashboard",
            icon: LayoutDashboard,
        },
        {
            title: "Leads",
            feature: "leads" as Feature,
            url: "/leads",
            icon: GalleryVerticalEnd,
        },
        {
            title: "Tasks",
            feature: "tasks" as Feature,
            url: "/tasks",
            icon: ListTodo,
        },
        {
            title: "Clients",
            feature: "clients" as Feature,
            url: "/clients",
            icon: SquareUser,
        },
        {
            title: "Deals",
            feature: "deals" as Feature,
            url: "/deals",
            icon: Handshake,
        },
        {
            title: "Projects",
            feature: "projects" as Feature,
            url: "/projects",
            icon: Building2,
        },
        {
            title: "Companies",
            feature: "companies" as Feature,
            url: "/companies",
            icon: Landmark,
        },
        {
            title: "Users",
            feature: "users" as Feature,
            url: "/users",
            icon: Users,
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
                {/* Filtered by role so nobody is offered a link that RoleGuard
                    will bounce them straight back from. */}
                <NavMain items={data.navMain.filter((item) => canAccess(user?.role, item.feature))} />
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
