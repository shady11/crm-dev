import {Trash2, X} from "lucide-react";
import {
    ActionBar,
    ActionBarBody,
    ActionBarClose,
    ActionBarContent,
    ActionBarSeparator,
    ActionBarValue,
} from "@/components/ui/action-bar.tsx";
import {Button} from "@/components/ui/button.tsx";
import {useTranslation} from "react-i18next";

interface UsersActionBarProps {
    selectedCount: number;
    isProcessing: boolean;
    onClear(): void;
    onDeactivate(): void;
}

export function UsersActionBar({ selectedCount, isProcessing, onClear, onDeactivate }: UsersActionBarProps) {
    const { t } = useTranslation("users");

    return (
        <ActionBar open={selectedCount > 0} onOpenChange={(open) => !open && onClear()}>
            <ActionBarContent aria-labelledby="users-action-bar-count">
                <ActionBarValue id="users-action-bar-count" count={selectedCount}>
                    {t("actionBar.selected", { count: selectedCount })}
                </ActionBarValue>

                <ActionBarSeparator />

                <ActionBarBody>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={isProcessing}
                        isLoading={isProcessing}
                        onClick={onDeactivate}
                    >
                        <Trash2 className="size-3.5" />
                        {t("card.deactivate")}
                    </Button>

                    <ActionBarClose asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={t("actionBar.clearSelection")}>
                            <X className="size-3.5" />
                        </Button>
                    </ActionBarClose>
                </ActionBarBody>
            </ActionBarContent>
        </ActionBar>
    );
}