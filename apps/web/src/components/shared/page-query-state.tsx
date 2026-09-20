import {AlertTriangleIcon} from "lucide-react";
import {useTranslation} from "react-i18next";
import {Button} from "@/components/ui/button.tsx";
import {Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/components/ui/empty.tsx";
import {Skeleton, SkeletonCircle} from "@/components/ui/skeleton.tsx";

// Shared loading/error shell for detail pages that fetch a single entity by
// id, so a slow request or a fetch error shows explicit feedback instead of
// silently rendering a blank page. The loading shape approximates the
// header + card layout every detail page (client, deal, ...) shares, so it
// reads as content taking shape rather than a generic spinner.
export function PageSkeleton() {
    const { t } = useTranslation("common");

    return (
        <div className="space-y-6" role="status" aria-label={t("labels.loading")}>
            <div className="flex items-center gap-3">
                <SkeletonCircle className="size-12" />
                <div className="flex flex-col gap-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-3.5 w-32" />
                </div>
            </div>
            <Skeleton className="h-32 w-full" />
            <div className="grid gap-4 lg:grid-cols-2">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        </div>
    );
}

interface PageErrorProps {
    onRetry(): void;
}

export function PageError({ onRetry }: PageErrorProps) {
    const { t } = useTranslation("common");

    return (
        <Empty>
            <EmptyHeader>
                <EmptyMedia variant="icon"><AlertTriangleIcon strokeWidth={1.25} /></EmptyMedia>
                <EmptyTitle>{t("errors.genericTitle")}</EmptyTitle>
                <EmptyDescription>{t("errors.tryAgain")}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
                <Button variant="secondary" onClick={onRetry}>{t("actions.retry")}</Button>
            </EmptyContent>
        </Empty>
    );
}
