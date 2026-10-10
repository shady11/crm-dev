import {Building} from "lucide-react";
import {Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle} from "@/components/ui/item.tsx";
import type {Block} from "@/features/blocks/types/block.types.ts";
import type {Entrance} from "@/features/entrances/types/entrance.types.ts";
import {EditBlockButton} from "./edit-block-button.tsx";
import {DeleteBlockButton} from "./delete-block-button.tsx";
import {AddEntranceButton} from "@/features/entrances/components/add-entrance-button.tsx";
import {EntranceItem} from "@/features/entrances/components/entrance-item.tsx";
import {DuplicateBlockButton} from "@/features/blocks/components/duplicate-block-button.tsx";
import {useTranslation} from "react-i18next";
import {Badge} from "@/components/ui/badge.tsx";
import {
    BLOCK_SALES_STATUS_BADGE_CLASSES,
    BLOCK_SALES_STATUS_LABEL_KEYS,
    completionQuarter,
} from "@/features/blocks/types/block-sales.ts";

interface BlockItemProps {
    block: Block;
    isExpanded: boolean;
    onToggle: () => void;
}

export function BlockItem({ block, isExpanded, onToggle }: BlockItemProps) {
    const { t } = useTranslation("blocks");

    return (
        <div>
            <Item
                variant="default"
                className="items-center border border-secondary p-4 cursor-pointer"
                onClick={onToggle}
            >
                <ItemMedia
                    variant="icon"
                    className="h-full"
                >
                    <Building className="size-8" strokeWidth={1.25} />
                </ItemMedia>
                <ItemContent>
                    <ItemTitle className="flex flex-wrap items-center gap-2">
                        {t("item.titleWithName", { name: block.name })}
                        {block.salesStatus && (
                            <Badge className={BLOCK_SALES_STATUS_BADGE_CLASSES[block.salesStatus]}>
                                {t(BLOCK_SALES_STATUS_LABEL_KEYS[block.salesStatus])}
                            </Badge>
                        )}
                    </ItemTitle>
                    <ItemDescription>
                        {[
                            t("item.entrances", { count: block.entrances.length }),
                            completionQuarter(t, block.completionDate) && t("completion", { quarter: completionQuarter(t, block.completionDate) }),
                        ].filter(Boolean).join(" · ")}
                    </ItemDescription>
                </ItemContent>
                <ItemActions onClick={(e) => e.stopPropagation()}>
                    <AddEntranceButton
                        block={block}
                    />
                    <DuplicateBlockButton block={block} />
                    <EditBlockButton block={block} />
                    <DeleteBlockButton block={block} />
                </ItemActions>
            </Item>

            {isExpanded && (
                <div className="px-6 mt-2 space-y-2">
                    {block.entrances.map((entrance: Entrance) => (
                        <EntranceItem
                            key={entrance.id}
                            entrance={entrance}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}