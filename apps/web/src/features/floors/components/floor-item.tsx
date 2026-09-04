import { useState } from "react";
import { Layers2 } from "lucide-react";
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item.tsx";
import type { Floor } from "@/features/floors/types/floor.types.ts";
import { EditFloorButton } from "./edit-floor-button.tsx";
import { DeleteFloorButton } from "./delete-floor-button.tsx";
import {AddUnitButton} from "@/features/units/components/add-unit-button.tsx";
import {UnitTable} from "@/features/units/components/unit-table.tsx";
import {AddUnitsBulkButton} from "@/features/units/components/add-units-bulk-button.tsx";
import type {Unit} from "@/features/units/types/unit.types.ts";
import {DuplicateFloorButton} from "@/features/floors/components/duplicate-floor-button.tsx";
import {useTranslation} from "react-i18next";

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

    return (
        <div>
            <Item variant="outline" className="bg-muted/50 py-2 cursor-pointer">
                <ItemMedia variant="icon" className="h-full">
                    <Layers2 className="size-4" />
                </ItemMedia>
                <ItemContent onClick={() => setIsExpanded(!isExpanded)}>
                    <ItemTitle>{t("item.titleWithNumber", { number: floor.number })}</ItemTitle>
                    <ItemDescription>{t("item.units", { count: floor.units?.length || 0 })}</ItemDescription>
                </ItemContent>
                <ItemActions>
                    <AddUnitButton floor={floor} />
                    <AddUnitsBulkButton
                        floorId={floor.id}
                        floorNumber={floor.number}
                        allBlockUnits={allBlockUnits}
                    />
                    <DuplicateFloorButton floor={floor} />
                    <EditFloorButton floor={floor} />
                    <DeleteFloorButton floor={floor} />
                </ItemActions>
            </Item>

            {/* Units Table */}
            {isExpanded && floor.units && floor.units.length > 0 && (
                <UnitTable
                    units={floor.units}
                />
            )}
        </div>
    );
}