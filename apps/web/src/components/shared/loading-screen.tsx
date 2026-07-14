import {Loader} from "lucide-react";

export function LoadingScreen() {
    return (
        <div className="flex min-h-svh items-center justify-center">
            <div className="text-sm text-muted-foreground">
                <Loader size={32} className="animate-spin"/>
            </div>
        </div>
    );
}