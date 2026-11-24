import type {Floor} from "@/features/floors/types/floor.types";
import type {Unit} from "@/features/units/types/unit.types";
import {cn} from "@/lib/utils";
import {ChessboardUnitCard} from "./chessboard-unit-card.tsx";

interface Props {
    floor: Floor;
    selectedUnit?: Unit | null;
    hasActiveFilters?: boolean;
    unitMatchesFilters?(unit: Unit): boolean;

    onUnitClick(unit: Unit): void;
}

export function ChessboardFloorRow({
                                       floor,
                                       selectedUnit,
                                       hasActiveFilters,
                                       unitMatchesFilters,
                                       onUnitClick,
                                   }: Props) {
    return (
        // Fixed height, so the floor labels beside the scrolling grid line up.
        <div className="flex h-22 rounded-md">
            <div
                className={cn(
                    "flex flex-1 gap-3"
                )}
            >
                {floor.units.map((unit) => (
                    <ChessboardUnitCard
                        key={unit.id}
                        unit={unit}
                        selected={selectedUnit?.id === unit.id}
                        dimmed={hasActiveFilters && !unitMatchesFilters?.(unit)}
                        onClick={() => onUnitClick(unit)}
                    />
                ))}
            </div>
        </div>
    );
}