import {Component, type ErrorInfo, type ReactNode} from "react";
import {withTranslation, type WithTranslation} from "react-i18next";
import {TriangleAlertIcon, RotateCwIcon} from "lucide-react";
import {Button} from "@/components/ui/button.tsx";
import {Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/components/ui/empty.tsx";

type ErrorBoundaryProps = WithTranslation & {
    children: ReactNode;
};

type ErrorBoundaryState = {
    hasError: boolean;
};

class ErrorBoundaryBase extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = {hasError: false};

    static getDerivedStateFromError() {
        return {hasError: true};
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Unhandled render error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            const {t} = this.props;

            return (
                <Empty className="h-[calc(100vh-var(--spacing)*28)]">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <TriangleAlertIcon strokeWidth={1.25} />
                        </EmptyMedia>
                        <EmptyTitle>{t("errors.genericTitle")}</EmptyTitle>
                        <EmptyDescription>{t("errors.tryAgain")}</EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent className="flex-row justify-center">
                        <Button size="sm" onClick={() => window.location.reload()}>
                            <RotateCwIcon className="size-3" />
                            {t("actions.reload")}
                        </Button>
                    </EmptyContent>
                </Empty>
            );
        }

        return this.props.children;
    }
}

export const ErrorBoundary = withTranslation("common")(ErrorBoundaryBase);
