import { useState } from "react";
import { ChevronRightIcon } from "lucide-react";
import type { Floor } from "@/features/floors/types/floor.types.ts";
import { EditFloorButton } from "./edit-floor-button.tsx";
import { DeleteFloorButton } from "./delete-floor-button.tsx";
import {AddUnitButton} from "@/features/units/components/add-unit-button.tsx";
import {UnitTable} from "@/features/units/components/unit-table.tsx";
import {AddUnitsBulkButton} from "@/features/units/components/add-units-bulk-button.tsx";
import type {Unit} from "@/features/units/types/unit.types.ts";
import {DuplicateFloorButton} from "@/features/floors/components/duplicate-floor-button.tsx";
import {useTranslation} from "react-i18next";
import {cn} from "@/lib/utils.ts";

interface FloorItemProps {
    floor: Floor;
    allBlockUnits: Unit[];
}

export function FloorItem({
                              floor,
                              allBlockUnits = []
}: FloorItemProps) {
    const { t } = useTranslation("floors");
    const [isExpanded, setIsExpanded] = useState(false);
    const unitCount = floor.units?.length || 0;

    return (
        // The unit table's first column lines up with the floor number tile:
        // row padding 2.5 + chevron 4 + gap 3 (spacing units).
        <div className="overflow-hidden rounded-[6px] border bg-card [--unit-table-inset:calc(var(--spacing)*9.5)]">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-2.5 py-2">
                <button
                    type="button"
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
                    onClick={() => setIsExpanded(!isExpanded)}
                    aria-expanded={isExpanded}
                >
                    <ChevronRightIcon
                        className={cn(
                            "size-4 shrink-0 text-muted-foreground transition-transform",
                            isExpanded && unitCount > 0 && "rotate-90",
                            unitCount === 0 && "opacity-30",
                        )}
                    />
                    {/* The floor number itself, like a lift button. */}
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-[6px] border bg-muted/50 text-sm font-semibold tabular-nums">
                        {floor.number}
                    </span>
                    <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{t("item.titleWithNumber", { number: floor.number })}</span>
                        <span className="block truncate text-xs text-muted-foreground">{t("item.units", { count: unitCount })}</span>
                    </span>
                </button>
                <div className="flex flex-wrap items-center gap-1 max-sm:w-full">
                    <AddUnitButton floor={floor} />
                    <AddUnitsBulkButton
                        floorId={floor.id}
                        floorNumber={floor.number}
                        allBlockUnits={allBlockUnits}
                    />
                    <span aria-hidden className="mx-1 h-5 w-px bg-border max-sm:hidden" />
                    <DuplicateFloorButton floor={floor} />
                    <EditFloorButton floor={floor} />
                    <DeleteFloorButton floor={floor} />
                </div>
            </div>

            {/* Units Table */}
            {isExpanded && floor.units && floor.units.length > 0 && (
                <UnitTable
                    units={floor.units}
                />
            )}
        </div>
    );
}
