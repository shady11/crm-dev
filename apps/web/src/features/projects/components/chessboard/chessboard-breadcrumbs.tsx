import {ArrowLeftIcon} from "lucide-react";
import {createListCollection} from "@ark-ui/react";
import {useTranslation} from "react-i18next";
import {Button} from "@/components/ui/button";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {cn} from "@/lib/utils";
import type {Block} from "@/features/blocks/types/block.types";
import type {Entrance} from "@/features/entrances/types/entrance.types";
import {
    BLOCK_SALES_STATUS_LABEL_KEYS,
    BlockSalesStatus,
    completionQuarter,
    isBlockBookable,
} from "@/features/blocks/types/block-sales";
import {namedLabel} from "@/lib/i18n/named-label.ts";

interface ChessboardBreadcrumbsProps {
    block: Block;
    entrance: Entrance;
    blocks: Block[];
    blockEntrances: Entrance[];
    onBack(): void;
    onBlockSelect(blockId: string): void;
    onEntranceSelect(entranceId: string): void;
}

/**
 * Block and entrance selects above the grid: every block and every
 * entrance of the current block is one pick away, instead of going back to
 * the pickers. Under them, the current block's sales status and expected
 * completion, when it has either.
 */
export function ChessboardBreadcrumbs({
    block,
    entrance,
    blocks,
    blockEntrances,
    onBack,
    onBlockSelect,
    onEntranceSelect,
}: ChessboardBreadcrumbsProps) {
    const {t} = useTranslation("projects");
    const quarter = completionQuarter(t, block.completionDate);
    // "On sale" with no date says nothing the grid doesn't already.
    const showStatus = !!quarter || (!!block.salesStatus && block.salesStatus !== BlockSalesStatus.ON_SALE);

    const blockCollection = createListCollection({
        items: blocks.map((item) => ({
            label: namedLabel(t, "chessboard.blockLabel", item.name),
            value: item.id,
            // Not on sale yet: viewable, visibly not bookable.
            muted: !isBlockBookable(item.salesStatus),
            status: item.salesStatus,
        })),
    });
    const entranceCollection = createListCollection({
        items: blockEntrances.map((item) => ({
            label: namedLabel(t, "chessboard.entranceLabel", item.name),
            value: item.id,
        })),
    });
    const switchable = blocks.length > 1 || blockEntrances.length > 1;

    // Back, then a select each for the block and the entrance (or, with
    // nothing to switch to, just their names); the block's sales status and
    // completion go underneath.
    return (
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2">
            <Button
                variant="outline"
                size="icon-lg"
                onClick={onBack}
                aria-label={t("common:actions.back")}
            >
                <ArrowLeftIcon />
            </Button>
            {switchable ? (
                <div className="flex flex-wrap items-center gap-2">
                    <Select
                        collection={blockCollection}
                        value={[block.id]}
                        onValueChange={(details) => details.value[0] && details.value[0] !== block.id && onBlockSelect(details.value[0])}
                    >
                        <SelectTrigger className="w-44" aria-label={t("chessboard.blocksNav")}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {blockCollection.items.map((item) => (
                                <SelectItem key={item.value} item={item}>
                                    <span className={cn(item.muted && "text-muted-foreground")}>{item.label}</span>
                                    {item.muted && item.status && (
                                        <span className="ms-auto ps-3 text-xs text-muted-foreground">
                                            {t(BLOCK_SALES_STATUS_LABEL_KEYS[item.status])}
                                        </span>
                                    )}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select
                        collection={entranceCollection}
                        value={[entrance.id]}
                        onValueChange={(details) => details.value[0] && details.value[0] !== entrance.id && onEntranceSelect(details.value[0])}
                    >
                        <SelectTrigger className="w-44" aria-label={t("chessboard.entrancesNav")}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {entranceCollection.items.map((item) => (
                                <SelectItem key={item.value} item={item}>
                                    {item.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            ) : (
                <p className="text-lg font-semibold">
                    {namedLabel(t, "chessboard.blockLabel", block.name)} · {namedLabel(t, "chessboard.entranceLabel", entrance.name)}
                </p>
            )}
            {showStatus && (
                <p className="col-start-2 text-sm text-muted-foreground">
                    {[
                        block.salesStatus && t(BLOCK_SALES_STATUS_LABEL_KEYS[block.salesStatus]),
                        quarter && t("blocks:completion", {quarter}),
                        !isBlockBookable(block.salesStatus) && t("blocks:notBookable"),
                    ].filter(Boolean).join(" · ")}
                </p>
            )}
        </div>
    );
}
