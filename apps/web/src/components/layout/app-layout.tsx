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
            // doesn't truncate the longer Kyrgyz/Russian nav labels. The
            // collapsed width is an icon button (size-8) plus p-2 on each
            // side; the stock "3rem" assumes a 0.25rem spacing unit, but ours
            // is 0.3rem, so items overflowed the card's right edge.
            style={{
                "--sidebar-width": "17.5rem",
                "--sidebar-width-icon": "calc(var(--spacing) * 12)",
            } as React.CSSProperties}
        >
            <SkipNavLink>{t("nav.skipToContent")}</SkipNavLink>

            <nav aria-label={t("nav.mainNavigation")}>
                <AppSidebar />
            </nav>

            {/* Header and page content are two cards floating on the shell,
                matching the floating sidebar: same gap on every side and
                between them. Only the content card scrolls. */}
            <SidebarInset className="h-svh overflow-hidden md:m-2 md:ms-0 md:h-[calc(100svh-(--spacing(4)))] md:gap-2 md:bg-transparent">
                <div className="shrink-0 overflow-hidden bg-background md:rounded-2xl md:border md:border-sidebar-border">
                    <ImpersonationBanner />
                    <AppHeader />
                </div>

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background md:rounded-2xl md:border md:border-sidebar-border">
                    <ScrollArea className="flex-1">
                        <SkipNavContent className="flex-1 p-6">
                            <Outlet />
                        </SkipNavContent>
                    </ScrollArea>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}