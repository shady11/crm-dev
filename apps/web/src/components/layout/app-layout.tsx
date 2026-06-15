import { Outlet } from "react-router-dom";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";

export function AppLayout() {
    return (
        <div className="min-h-screen bg-background">
            <div className="flex">
                <AppSidebar />

                <div className="flex min-h-screen flex-1 flex-col">
                    <AppHeader />

                    <main className="flex-1 p-6">
                        <Outlet />
                    </main>
                </div>
            </div>
        </div>
    );
}