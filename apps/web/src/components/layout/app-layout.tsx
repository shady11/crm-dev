import {Outlet} from "react-router-dom";
import {AppHeader} from "./header/app-header.tsx";
import {AppSidebar} from "./sidebar/app-sidebar.tsx";
import {SidebarProvider} from "@/components/ui/sidebar.tsx";
import {ScrollArea} from "@/components/ui/scroll-area.tsx";
import {useNotificationsSocket} from "@/features/notifications/hooks/use-notifications-socket.ts";
import {ImpersonationBanner} from "@/features/auth/components/impersonation-banner.tsx";

export function AppLayout() {
    useNotificationsSocket();

    return (
        <SidebarProvider>
            <AppSidebar />

            <div className="flex flex-1 flex-col bg-background rounded-lg overflow-hidden">
                <ImpersonationBanner />
                <AppHeader />

                <ScrollArea className="h-[calc(100vh-var(--spacing)*16)]">
                    <div className="flex-1 p-6">
                        <Outlet />
                    </div>
                </ScrollArea>
            </div>
        </SidebarProvider>
    );
}