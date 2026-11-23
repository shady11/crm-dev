import { useState } from "react";
import {ChevronRightIcon, DoorOpenIcon} from "lucide-react";
import type { Entrance } from "@/features/entrances/types/entrance.types.ts";
import type { Floor } from "@/features/floors/types/floor.types.ts";
import { EditEntranceButton } from "./edit-entrance-button.tsx";
import { DeleteEntranceButton } from "./delete-entrance-button.tsx";
import {AddFloorButton} from "@/features/floors/components/add-floor-button.tsx";
import {FloorItem} from "@/features/floors/components/floor-item.tsx";
import {AddFloorsBulkButton} from "@/features/floors/components/add-floors-bulk-button.tsx";
import {DuplicateEntranceButton} from "@/features/entrances/components/duplicate-entrance-button.tsx";
import {useTranslation} from "react-i18next";
import {cn} from "@/lib/utils.ts";

interface EntranceItemProps {
    entrance: Entrance;
}

export function EntranceItem({ entrance }: EntranceItemProps) {
    const { t } = useTranslation(["entrances", "floors"]);
    const [isExpanded, setIsExpanded] = useState(false);

    const allBlockUnits = entrance.floors?.flatMap(f => f.units || []) || [];

    return (
        <div className="overflow-hidden rounded-[8px] border bg-card shadow-xs">
            <div
                className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-2.5 px-3 py-2.5 transition-colors hover:bg-muted/30"
                onClick={() => setIsExpanded(!isExpanded)}
                aria-expanded={isExpanded}
            >
                <ChevronRightIcon
                    className={cn("size-4 shrink-0 text-muted-foreground transition-transform", isExpanded && "rotate-90")}
                />
                <span className="icon-tile flex size-8 shrink-0 items-center justify-center bg-amber-500">
                    <DoorOpenIcon className="size-4" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t("item.titleWithName", { name: entrance.name })}</p>
                    <p className="truncate text-xs text-muted-foreground">
                        {t("item.floors", { count: entrance.floors?.length || 0 })}
                        {" · "}
                        {t("floors:item.units", { count: allBlockUnits.length })}
                    </p>
                </div>
                <div
                    className="flex flex-wrap items-center gap-1 max-sm:w-full"
                    onClick={(e) => e.stopPropagation()}
                >
                    <AddFloorButton entrance={entrance} />
                    <AddFloorsBulkButton
                        entrance={entrance}
                        existingFloors={entrance.floors || []}
                    />
                    <span aria-hidden className="mx-1 h-5 w-px bg-border max-sm:hidden" />
                    <DuplicateEntranceButton entrance={entrance} />
                    <EditEntranceButton entrance={entrance} />
                    <DeleteEntranceButton entrance={entrance} />
                </div>
            </div>

            {/* Floors, top floor first, as in the building. */}
            {isExpanded && entrance.floors && (
                <div className="space-y-1.5 border-t bg-muted/20 p-1.5 sm:p-2.5">
                    {entrance.floors.length > 0 ? (
                        entrance.floors
                            .sort((a, b) => b.number - a.number)
                            .map((floor: Floor) => (
                                <FloorItem
                                    key={floor.id}
                                    floor={floor}
                                    allBlockUnits={allBlockUnits}
                                />
                            ))
                    ) : (
                        <p className="py-3 text-center text-sm text-muted-foreground">{t("item.noFloors")}</p>
                    )}
                </div>
            )}
        </div>
    );
}
