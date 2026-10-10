import {ArrowLeftIcon} from "lucide-react";
import {useTranslation} from "react-i18next";
import {Button} from "@/components/ui/button";
import {cn} from "@/lib/utils";
import type {Block} from "@/features/blocks/types/block.types";
import type {Entrance} from "@/features/entrances/types/entrance.types";

interface ChessboardBreadcrumbsProps {
    block: Block;
    entrance: Entrance;
    blocks: Block[];
    blockEntrances: Entrance[];
    onBack(): void;
    onBlockSelect(blockId: string): void;
    onEntranceSelect(entranceId: string): void;
}

function Pill({active, onClick, children}: {active: boolean; onClick(): void; children: string}) {
    return (
        <button
            type="button"
            aria-pressed={active}
            onClick={onClick}
            className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                active ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/70",
            )}
        >
            {children}
        </button>
    );
}

/**
 * Block and entrance switchers above the grid: every block and every
 * entrance of the current block is one click away, instead of going back to
 * the pickers. A row with a single option is left out.
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
    // With a single row (one switcher, or just the label) the Back button
    // centres on it; with both rows it lines up with the first.
    const singleRow = blocks.length <= 1 || blockEntrances.length <= 1;

    return (
        <div className={cn("flex gap-3", singleRow ? "items-center" : "items-start")}>
            <Button variant="outline" size="icon-sm" className={cn("shrink-0", !singleRow && "mt-0.5")} onClick={onBack} aria-label={t("common:actions.back")}>
                <ArrowLeftIcon className="size-3" />
            </Button>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
                {blocks.length > 1 && (
                    <nav className="flex gap-1.5 overflow-x-auto pb-0.5" aria-label={t("chessboard.blocksNav")}>
                        {blocks.map((item) => (
                            <Pill key={item.id} active={item.id === block.id} onClick={() => onBlockSelect(item.id)}>
                                {t("chessboard.blockLabel", {name: item.name})}
                            </Pill>
                        ))}
                    </nav>
                )}
                {blockEntrances.length > 1 ? (
                    <nav className="flex gap-1.5 overflow-x-auto pb-0.5" aria-label={t("chessboard.entrancesNav")}>
                        {blockEntrances.map((item) => (
                            <Pill key={item.id} active={item.id === entrance.id} onClick={() => onEntranceSelect(item.id)}>
                                {t("chessboard.entranceLabel", {name: item.name})}
                            </Pill>
                        ))}
                    </nav>
                ) : (
                    blocks.length <= 1 && (
                        <p className="text-sm font-medium">
                            {t("chessboard.blockLabel", {name: block.name})} · {t("chessboard.entranceLabel", {name: entrance.name})}
                        </p>
                    )
                )}
            </div>
        </div>
    );
}
