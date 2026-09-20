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
        <SidebarProvider>
            <SkipNavLink>{t("nav.skipToContent")}</SkipNavLink>

            <nav aria-label={t("nav.mainNavigation")}>
                <AppSidebar />
            </nav>

            <SidebarInset className="rounded-lg overflow-hidden">
                <ImpersonationBanner />
                <AppHeader />

                <ScrollArea className="h-[calc(100vh-var(--spacing)*16)]">
                    <SkipNavContent className="flex-1 p-6">
                        <Outlet />
                    </SkipNavContent>
                </ScrollArea>
            </SidebarInset>
        </SidebarProvider>
    );
}