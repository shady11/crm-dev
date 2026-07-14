import { Outlet } from "react-router-dom";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";
import {SidebarProvider} from "@/components/ui/sidebar.tsx";

export function AppLayout() {
    return (
        <SidebarProvider>
            <AppSidebar />

            <div className="flex min-h-screen flex-1 flex-col">
                <AppHeader />

                <main className="flex-1 p-6">
                    <Outlet />
                </main>
            </div>
        </SidebarProvider>
    );
}