import {useNavigate} from "react-router-dom";
import {ArrowLeftIcon, CompassIcon, LayoutDashboardIcon} from "lucide-react";
import {Button} from "@/components/ui/button.tsx";
import {Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle,} from "@/components/ui/empty.tsx";
import {paths} from "@/routes/paths";

export function NotFoundPage() {
    const navigate = useNavigate();

    const canGoBack = window.history.length > 1;

    return (
            <Empty className=" h-[calc(100vh-var(--spacing)*28)]">
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <CompassIcon strokeWidth={1.25} />
                    </EmptyMedia>
                    <EmptyTitle>Page not found</EmptyTitle>
                    <EmptyDescription>
                        The page you're looking for doesn't exist or may have been moved.
                    </EmptyDescription>
                </EmptyHeader>
                <EmptyContent className="flex-row justify-center gap-2">
                    {canGoBack && (
                        <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>
                            <ArrowLeftIcon className="size-3" />
                            Go back
                        </Button>
                    )}
                    <Button size="sm" onClick={() => navigate(paths.dashboard)}>
                        <LayoutDashboardIcon className="size-3" />
                        Go to Dashboard
                    </Button>
                </EmptyContent>
            </Empty>
    );
}