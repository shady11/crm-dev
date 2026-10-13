import {Trash2, UserRoundCogIcon, X} from "lucide-react";
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
import {useAuth} from "@/features/auth/hooks/use-auth.ts";
import {hasPermission} from "@/features/auth/access.ts";

interface LeadsActionBarProps {
    selectedCount: number;
    isProcessing: boolean;
    onClear(): void;
    onRequestDelete(): void;
    onRequestReassign(): void;
}

export function LeadsActionBar({ selectedCount, isProcessing, onClear, onRequestDelete, onRequestReassign }: LeadsActionBarProps) {
    const { t } = useTranslation("leads");
    const { user } = useAuth();
    const canDelete = hasPermission(user, "leads.delete");
    // SH-5: the same team-lead permission as reassigning one lead.
    const canReassign = hasPermission(user, "leads.assign");

    return (
        <ActionBar open={selectedCount > 0} onOpenChange={(open) => !open && onClear()}>
            <ActionBarContent aria-labelledby="leads-action-bar-count">
                <ActionBarValue id="leads-action-bar-count" count={selectedCount}>
                    {t("actionBar.selected", { count: selectedCount })}
                </ActionBarValue>

                <ActionBarSeparator />

                <ActionBarBody>
                    {canReassign && (
                        <Button variant="ghost" size="sm" disabled={isProcessing} onClick={onRequestReassign}>
                            <UserRoundCogIcon className="size-3.5" />
                            {t("actionBar.reassign")}
                        </Button>
                    )}
                    {canDelete && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            disabled={isProcessing}
                            isLoading={isProcessing}
                            onClick={onRequestDelete}
                        >
                            <Trash2 className="size-3.5" />
                            {t("actionBar.delete")}
                        </Button>
                    )}

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
