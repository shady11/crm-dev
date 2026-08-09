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

interface LeadsActionBarProps {
    selectedCount: number;
    isProcessing: boolean;
    onClear(): void;
    onRequestDelete(): void;
}

export function LeadsActionBar({ selectedCount, isProcessing, onClear, onRequestDelete }: LeadsActionBarProps) {
    return (
        <ActionBar open={selectedCount > 0} onOpenChange={(open) => !open && onClear()}>
            <ActionBarContent aria-labelledby="leads-action-bar-count">
                <ActionBarValue id="leads-action-bar-count" count={selectedCount}>
                    {selectedCount} selected
                </ActionBarValue>

                <ActionBarSeparator />

                <ActionBarBody>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={isProcessing}
                        isLoading={isProcessing}
                        onClick={onRequestDelete}
                    >
                        <Trash2 className="size-3.5" />
                        Delete
                    </Button>

                    <ActionBarClose asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="Clear selection">
                            <X className="size-3.5" />
                        </Button>
                    </ActionBarClose>
                </ActionBarBody>
            </ActionBarContent>
        </ActionBar>
    );
}
