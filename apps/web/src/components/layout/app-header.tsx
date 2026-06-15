import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { authStorage } from "@/lib/auth-storage";
import { Button } from "@/components/ui/button";

export function AppHeader() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const logout = () => {
        authStorage.clear();
        queryClient.clear();
        navigate("/login");
    };

    return (
        <header className="h-16 border-b px-6 flex items-center justify-between">
            <div>
                <h1 className="font-semibold">Developer CRM</h1>
            </div>

            <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
            </Button>
        </header>
    );
}