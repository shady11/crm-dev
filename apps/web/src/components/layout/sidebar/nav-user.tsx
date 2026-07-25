"use client"

import {Avatar, AvatarFallback, AvatarImage,} from "@/components/ui/avatar.tsx"
import {SidebarMenu, SidebarMenuButton, SidebarMenuItem,} from "@/components/ui/sidebar.tsx"
import {authStorage} from "@/lib/auth-storage.ts";
import {useNavigate} from "react-router-dom";
import {useQueryClient} from "@tanstack/react-query";
import {
    Menu,
    MenuContent,
    MenuGroup,
    MenuGroupLabel,
    MenuItem,
    MenuSeparator,
    MenuTrigger
} from "@/components/ui/menu.tsx";
import {BadgeCheck, Bell, ChevronsUpDown, LogOut} from "lucide-react";

export function NavUser({
                            user,
                        }: {
    user: {
        name: string
        email: string
        avatar: string
    }
}) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const logout = () => {
        authStorage.clear();
        queryClient.clear();
        navigate("/login");
    };

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <Menu>
                    <MenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <Avatar className="h-8 w-8 rounded-lg">
                                <AvatarImage src={user.avatar} alt={user.name} />
                                <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                            </Avatar>
                            <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                                <span className="truncate font-medium">{user.name}</span>
                                <span className="truncate text-xs">{user.email}</span>
                            </div>
                            <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
                        </SidebarMenuButton>
                    </MenuTrigger>
                    <MenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                    >
                        <MenuGroup>
                            <MenuGroupLabel className="p-0 font-normal">
                                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                    <Avatar className="h-8 w-8 rounded-lg">
                                        <AvatarImage src={user.avatar} alt={user.name} />
                                        <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                                    </Avatar>
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-medium">{user.name}</span>
                                        <span className="truncate text-xs">{user.email}</span>
                                    </div>
                                </div>
                            </MenuGroupLabel>
                        </MenuGroup>
                        <MenuGroup>
                            <MenuItem value="account">
                                <BadgeCheck />
                                Account
                            </MenuItem>
                            <MenuItem value="notifications">
                                <Bell />
                                Notifications
                            </MenuItem>
                        </MenuGroup>
                        <MenuSeparator />
                        <MenuItem value="logout" onClick={logout}>
                            <LogOut />
                            Log out
                        </MenuItem>
                    </MenuContent>
                </Menu>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}
