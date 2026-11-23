import {Navigate} from "react-router-dom";
import {LoginForm} from "../components/login-form";
import {authStorage} from "@/features/auth/utils/auth-storage.ts";
import {useTheme} from "@/hooks/use-theme.ts";

export function LoginPage() {
    // Applies the saved light/dark choice here too; elsewhere the header does it.
    useTheme();
    const token = authStorage.getToken();

    if (token) {
        // "/" is RoleLanding, which picks the right first page for each role.
        return <Navigate to="/" replace />;
    }

    return (
        <div className="flex min-h-svh flex-col items-center justify-center p-5">
            <LoginForm />
        </div>
    );
}