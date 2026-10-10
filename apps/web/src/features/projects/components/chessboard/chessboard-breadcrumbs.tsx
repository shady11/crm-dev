import {ArrowLeftIcon, CalendarIcon} from "lucide-react";
import {Fragment} from "react";
import {useTranslation} from "react-i18next";
import {Button} from "@/components/ui/button";
import {cn} from "@/lib/utils";
import type {Block} from "@/features/blocks/types/block.types";
import type {Entrance} from "@/features/entrances/types/entrance.types";
import {Badge} from "@/components/ui/badge";
import {
    completionQuarter,
    isPhaseBookable,
    PHASE_STATUS_BADGE_CLASSES,
    PHASE_STATUS_LABEL_KEYS,
} from "@/features/phases/types/phase.types";

interface ChessboardBreadcrumbsProps {
    block: Block;
    entrance: Entrance;
    blocks: Block[];
    blockEntrances: Entrance[];
    onBack(): void;
    onBlockSelect(blockId: string): void;
    onEntranceSelect(entranceId: string): void;
}

function Pill({active, muted, onClick, children}: {active: boolean; muted?: boolean; onClick(): void; children: string}) {
    return (
        <button
            type="button"
            aria-pressed={active}
            onClick={onClick}
            className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                active ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/70",
                // A block whose phase isn't on sale yet: viewable, visibly not bookable.
                muted && !active && "border border-dashed border-muted-foreground/40 bg-transparent text-muted-foreground",
            )}
        >
            {children}
        </button>
    );
}

/**
 * Block and entrance switchers above the grid: every block and every
 * entrance of the current block is one click away, instead of going back to
 * the pickers. A row with a single option is left out. In a project split
 * into construction phases, blocks are grouped under their phase, and the
 * current block's phase (status, completion) shows underneath.
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

    const phase = block.phase;
    const quarter = completionQuarter(t, phase?.completionDate);

    return (
        <div className="flex flex-col gap-2">
            <div className={cn("flex gap-3", singleRow ? "items-center" : "items-start")}>
                <Button variant="outline" size="icon-sm" className={cn("shrink-0", !singleRow && "mt-0.5")} onClick={onBack} aria-label={t("common:actions.back")}>
                    <ArrowLeftIcon className="size-3" />
                </Button>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                    {blocks.length > 1 && (
                        <nav className="flex gap-1.5 overflow-x-auto pb-0.5" aria-label={t("chessboard.blocksNav")}>
                            {blocks.map((item, index) => {
                                // Blocks arrive grouped by phase; label each group once.
                                const startsGroup = !!item.phase && item.phase.id !== blocks[index - 1]?.phase?.id;
                                return (
                                    <Fragment key={item.id}>
                                        {startsGroup && (
                                            <span className={cn("shrink-0 self-center text-xs font-medium whitespace-nowrap text-muted-foreground", index > 0 && "ml-2")}>
                                                {item.phase!.name}
                                            </span>
                                        )}
                                        <Pill active={item.id === block.id} muted={!isPhaseBookable(item.phase)} onClick={() => onBlockSelect(item.id)}>
                                            {t("chessboard.blockLabel", {name: item.name})}
                                        </Pill>
                                    </Fragment>
                                );
                            })}
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
            {phase && (
                // Indented to line up with the tabs, past the Back button.
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pl-11 text-sm">
                    <span className="font-medium">{phase.name}</span>
                    <Badge className={PHASE_STATUS_BADGE_CLASSES[phase.salesStatus]}>{t(PHASE_STATUS_LABEL_KEYS[phase.salesStatus])}</Badge>
                    {quarter && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                            <CalendarIcon className="size-3.5" />
                            {t("phases:completion", {quarter})}
                        </span>
                    )}
                    {!isPhaseBookable(phase) && <span className="text-muted-foreground">· {t("phases:notBookable")}</span>}
                </div>
            )}
        </div>
    );
}
