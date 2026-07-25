import type {Floor} from "@/features/floors/types/floor.types";
import type {Unit} from "@/features/units/types/unit.types";
import {ChessboardFloorRow} from "./chessboard-floor-row.tsx";

interface Props {
    floors: Floor[];

    selectedUnit?: Unit | null;
    hasActiveFilters?: boolean;
    unitMatchesFilters?(unit: Unit): boolean;

    onUnitClick(
        floor: Floor,
        unit: Unit
    ): void;
}

export function ChessboardGrid({
                                   floors,
                                   selectedUnit,
                                   hasActiveFilters,
                                   unitMatchesFilters,
                                   onUnitClick,
                               }: Props) {
    return (
        <div className="min-w-max flex flex-col gap-3">
            {floors.map((floor) => (
                <ChessboardFloorRow
                    key={floor.id}
                    floor={floor}
                    selectedUnit={selectedUnit}
                    hasActiveFilters={hasActiveFilters}
                    unitMatchesFilters={unitMatchesFilters}
                    onUnitClick={(unit) =>
                        onUnitClick(floor, unit)
                    }
                />
            ))}
        </div>
    );
}