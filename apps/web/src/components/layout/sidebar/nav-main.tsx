"use client"

import {Collapsible, CollapsibleContent, CollapsibleTrigger,} from "@/components/ui/collapsible.tsx"
import {
    SidebarGroup,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from "@/components/ui/sidebar.tsx"
import {ChevronRight, type LucideIcon} from "lucide-react";
import {Link, useLocation} from "react-router-dom";

// A nav item is active on its own route and on any nested route below it
// (e.g. "/projects" stays highlighted for "/projects/<id>/overview"), but
// "/" must only match the root itself or every item would light up.
function isNavItemActive(pathname: string, url: string) {
    return url === "/" ? pathname === "/" : pathname === url || pathname.startsWith(`${url}/`);
}

export function NavMain({
                            items,
                        }: {
    items: {
        title: string
        url: string
        feature?: string
        icon?: LucideIcon
        isActive?: boolean
        items?: {
            title: string
            url: string
        }[]
    }[]
}) {
    const { pathname } = useLocation();

    return (
        <SidebarGroup>
            <SidebarMenu>
                {items.map((item) =>
                    item.items?.length ? (
                        <Collapsible
                            key={item.title}
                            asChild
                            defaultOpen={item.isActive}
                            className="group/collapsible"
                        >
                            <SidebarMenuItem>
                                <CollapsibleTrigger asChild>
                                    <SidebarMenuButton tooltip={item.title}>
                                        {item.icon && <item.icon />}
                                        <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                                        {item.items?.length && <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden"/>}
                                    </SidebarMenuButton>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <SidebarMenuSub>
                                        {item.items?.map((subItem) => (
                                            <SidebarMenuSubItem key={subItem.title}>
                                                <SidebarMenuSubButton asChild isActive={isNavItemActive(pathname, subItem.url)}>
                                                    <Link to={subItem.url}>
                                                        <span className="font-medium">{subItem.title}</span>
                                                    </Link>
                                                </SidebarMenuSubButton>
                                            </SidebarMenuSubItem>
                                        ))}
                                    </SidebarMenuSub>
                                </CollapsibleContent>
                            </SidebarMenuItem>
                        </Collapsible>
                    ): (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton asChild tooltip={item.title} isActive={isNavItemActive(pathname, item.url)}>
                                <Link to={item.url}>
                                    {item.icon && <item.icon />}
                                    <span className="font-medium group-data-[collapsible=icon]:hidden">{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    )
                )}
            </SidebarMenu>
        </SidebarGroup>
    )
}
