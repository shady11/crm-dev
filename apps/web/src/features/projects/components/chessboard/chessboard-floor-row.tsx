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
        <div className="flex min-h-15 gap-3 rounded-md">
            <div className="flex flex-col justify-center py-2 min-w-8">
                <span className="font-medium text-muted-foreground">{floor.number}</span>
            </div>

            <div
                className={cn(
                    "flex-1 flex flex-wrap gap-3"
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