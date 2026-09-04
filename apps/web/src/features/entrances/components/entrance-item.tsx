import { useState } from "react";
import {SquareArrowRightEnterIcon} from "lucide-react";
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item.tsx";
import type { Entrance } from "@/features/entrances/types/entrance.types.ts";
import type { Floor } from "@/features/floors/types/floor.types.ts";
import { EditEntranceButton } from "./edit-entrance-button.tsx";
import { DeleteEntranceButton } from "./delete-entrance-button.tsx";
import {AddFloorButton} from "@/features/floors/components/add-floor-button.tsx";
import {FloorItem} from "@/features/floors/components/floor-item.tsx";
import {AddFloorsBulkButton} from "@/features/floors/components/add-floors-bulk-button.tsx";
import {DuplicateEntranceButton} from "@/features/entrances/components/duplicate-entrance-button.tsx";
import {useTranslation} from "react-i18next";

interface EntranceItemProps {
    entrance: Entrance;
}

export function EntranceItem({ entrance }: EntranceItemProps) {
    const { t } = useTranslation("entrances");
    const [isExpanded, setIsExpanded] = useState(false);

    const allBlockUnits = entrance.floors?.flatMap(f => f.units || []) || [];

    return (
        <div>
            <Item
                variant="outline"
                className="items-center bg-muted/50 border shadow-none py-3 cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <ItemMedia
                    variant="icon"
                    className="h-full"
                >
                    <SquareArrowRightEnterIcon className="size-6" strokeWidth={1.25}/>
                </ItemMedia>
                <ItemContent>
                    <ItemTitle>{t("item.titleWithName", { name: entrance.name })}</ItemTitle>
                    <ItemDescription>{t("item.floors", { count: entrance.floors?.length || 0 })}</ItemDescription>
                </ItemContent>
                <ItemActions onClick={(e) => e.stopPropagation()}>
                    <AddFloorButton entrance={entrance} />
                    <AddFloorsBulkButton
                        entrance={entrance}
                        existingFloors={entrance.floors || []}
                    />
                    <DuplicateEntranceButton entrance={entrance} />
                    <EditEntranceButton entrance={entrance} />
                    <DeleteEntranceButton entrance={entrance} />
                </ItemActions>
            </Item>

            {/* Floors */}
            {isExpanded && entrance.floors && (
                <div className="px-6 py-2 space-y-2">
                    {entrance.floors
                        .sort((a, b) => b.number - a.number)
                        .map((floor: Floor) => (
                            <FloorItem
                                key={floor.id}
                                floor={floor}
                                allBlockUnits={allBlockUnits}
                            />
                        ))}
                </div>
            )}
        </div>
    );
}