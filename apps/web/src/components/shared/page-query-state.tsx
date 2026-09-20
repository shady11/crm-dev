import {AlertTriangleIcon} from "lucide-react";
import {useTranslation} from "react-i18next";
import {Button} from "@/components/ui/button.tsx";
import {Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/components/ui/empty.tsx";
import {Spinner} from "@/components/ui/spinner.tsx";

// Shared loading/error shell for detail pages that fetch a single entity by
// id, so a slow request or a fetch error shows explicit feedback instead of
// silently rendering a blank page.
export function PageSpinner() {
    return (
        <div className="flex h-64 items-center justify-center">
            <Spinner className="size-6" />
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
