import type React from "react";
import {Outlet} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {AppHeader} from "./header/app-header.tsx";
import {AppSidebar} from "./sidebar/app-sidebar.tsx";
import {SidebarInset, SidebarProvider} from "@/components/ui/sidebar.tsx";
import {ScrollArea} from "@/components/ui/scroll-area.tsx";
import {SkipNavContent, SkipNavLink} from "@/components/ui/skip-nav.tsx";
import {useNotificationsSocket} from "@/features/notifications/hooks/use-notifications-socket.ts";
import {ImpersonationBanner} from "@/features/auth/components/impersonation-banner.tsx";

export function AppLayout() {
    useNotificationsSocket();
    const { t } = useTranslation("common");

    return (
        <SidebarProvider
            className="bg-shell"
            // Wider than the 16rem default so the floating card's padding
            // doesn't truncate the longer Kyrgyz/Russian nav labels.
            style={{"--sidebar-width": "17.5rem"} as React.CSSProperties}
        >
            <SkipNavLink>{t("nav.skipToContent")}</SkipNavLink>

            <nav aria-label={t("nav.mainNavigation")}>
                <AppSidebar />
            </nav>

            {/* A card floating on the shell, matching the floating sidebar: same
                gap on every side, and it scrolls inside itself. */}
            <SidebarInset className="h-svh overflow-hidden md:m-2 md:ms-0 md:h-[calc(100svh-(--spacing(4)))] md:rounded-2xl md:border md:border-sidebar-border">
                <ImpersonationBanner />
                <AppHeader />

                <ScrollArea className="flex-1">
                    <SkipNavContent className="flex-1 p-6">
                        <Outlet />
                    </SkipNavContent>
                </ScrollArea>
            </SidebarInset>
        </SidebarProvider>
    );
}