import {Navigate} from "react-router-dom";
import {LoginForm} from "../components/login-form";
import {authStorage} from "@/features/auth/utils/auth-storage.ts";

export function LoginPage() {
    const token = authStorage.getToken();

    if (token) {
        return <Navigate to="/projects" replace />;
    }

    return (
        <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
            <div className="w-full max-w-sm md:max-w-4xl">
                <LoginForm />
            </div>
        </div>
    );
}