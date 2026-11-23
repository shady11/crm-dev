import {Building2, ChevronRightIcon} from "lucide-react";
import {Badge} from "@/components/ui/badge.tsx";
import {Card} from "@/components/ui/card.tsx";
import type {Block} from "@/features/blocks/types/block.types.ts";
import type {Entrance} from "@/features/entrances/types/entrance.types.ts";
import {EditBlockButton} from "./edit-block-button.tsx";
import {DeleteBlockButton} from "./delete-block-button.tsx";
import {AddEntranceButton} from "@/features/entrances/components/add-entrance-button.tsx";
import {EntranceItem} from "@/features/entrances/components/entrance-item.tsx";
import {DuplicateBlockButton} from "@/features/blocks/components/duplicate-block-button.tsx";
import {useTranslation} from "react-i18next";
import {BLOCK_SALES_STATUS_LABEL_KEYS, completionQuarter} from "@/features/blocks/types/block-sales.ts";
import {cn} from "@/lib/utils.ts";

interface BlockItemProps {
    block: Block;
    isExpanded: boolean;
    onToggle: () => void;
}

/**
 * One block of the builder: a card whose header toggles the block's
 * entrances, with the block's own actions on the right.
 */
export function BlockItem({ block, isExpanded, onToggle }: BlockItemProps) {
    const { t } = useTranslation(["blocks", "entrances", "floors"]);
    const quarter = completionQuarter(t, block.completionDate);
    const floors = block.entrances.reduce((sum, e) => sum + (e.floors?.length ?? 0), 0);
    const units = block.entrances.reduce(
        (sum, e) => sum + (e.floors ?? []).reduce((s, f) => s + (f.units?.length ?? 0), 0),
        0,
    );

    return (
        <Card className="gap-0 overflow-hidden py-0">
            <div
                className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-3 p-4 transition-colors hover:bg-muted/30"
                onClick={onToggle}
                aria-expanded={isExpanded}
            >
                <ChevronRightIcon
                    className={cn("size-4 shrink-0 text-muted-foreground transition-transform", isExpanded && "rotate-90")}
                />
                <span className="icon-tile flex size-10 shrink-0 items-center justify-center bg-primary">
                    <Building2 className="size-5" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold">{t("item.titleWithName", { name: block.name })}</p>
                        {block.salesStatus && (
                            <Badge variant="secondary">{t(BLOCK_SALES_STATUS_LABEL_KEYS[block.salesStatus])}</Badge>
                        )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {[
                            t("item.entrances", { count: block.entrances.length }),
                            t("entrances:item.floors", { count: floors }),
                            t("floors:item.units", { count: units }),
                            quarter && t("completion", { quarter }),
                        ].filter(Boolean).join(" · ")}
                    </p>
                </div>
                <div
                    className="flex items-center gap-1 max-sm:w-full max-sm:flex-wrap"
                    onClick={(e) => e.stopPropagation()}
                >
                    <AddEntranceButton block={block} />
                    <span aria-hidden className="mx-1 h-5 w-px bg-border max-sm:hidden" />
                    <DuplicateBlockButton block={block} />
                    <EditBlockButton block={block} />
                    <DeleteBlockButton block={block} />
                </div>
            </div>

            {isExpanded && (
                <div className="space-y-2 border-t bg-muted/20 p-2 sm:p-4">
                    {block.entrances.length > 0 ? (
                        block.entrances.map((entrance: Entrance) => (
                            <EntranceItem key={entrance.id} entrance={entrance} />
                        ))
                    ) : (
                        <p className="py-4 text-center text-sm text-muted-foreground">{t("item.noEntrances")}</p>
                    )}
                </div>
            )}
        </Card>
    );
}
