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
        <div className="flex min-h-15 rounded-md">
            {/* Pinned, so the floor stays named while the row scrolls sideways. */}
            <div className="sticky left-0 z-10 flex flex-col justify-center py-2 min-w-11 pr-3 bg-card">
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