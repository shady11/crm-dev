import {Dot} from "lucide-react";
import {createListCollection} from "@ark-ui/react";
import {Badge} from "@/components/ui/badge";
import {Card, CardContent, CardHeader} from "@/components/ui/card";
import {Status} from "@/components/ui/status";
import {ChessboardGrid} from "@/features/projects/components/chessboard/chessboard-grid.tsx";
import type {Floor} from "@/features/floors/types/floor.types";
import {
    type Unit,
    UNIT_STATUS_CLASSES,
    UNIT_STATUS_LABELS,
    UNIT_STATUS_VALUES,
} from "@/features/units/types/unit.types";

interface ChessboardCardProps {
    entranceName: string;
    floors: Floor[];
    totalFloors: number;
    totalUnits: number;
    selectedUnit: Unit | null;
    hasActiveFilters?: boolean;
    unitMatchesFilters?(unit: Unit): boolean;
    onUnitClick(floor: Floor, unit: Unit): void;
}

const statusCollection = createListCollection({
    items: UNIT_STATUS_VALUES.map((status) => ({
        label: UNIT_STATUS_LABELS[status],
        value: status,
    })),
});

export function ChessboardCard({
                                   entranceName,
                                   floors,
                                   totalFloors,
                                   totalUnits,
                                   selectedUnit,
                                   hasActiveFilters,
                                   unitMatchesFilters,
                                   onUnitClick,
                               }: ChessboardCardProps) {
    return (
        <Card className="border border-secondary p-0 gap-0">
            <CardHeader className="gap-0 border-b py-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-medium">Entrance {entranceName}</h3>

                    <div className="flex flex-wrap items-center gap-4">
                        {statusCollection.items.map((status) => (
                            <div key={status.value} className="flex items-center gap-1 text-sm">
                                <Status
                                    size="sm"
                                    variant="default"
                                    className={UNIT_STATUS_CLASSES[status.value]}
                                />
                                {status.label}
                            </div>
                        ))}
                    </div>

                    <Badge variant="secondary" className="text-xs">
                        {totalFloors} floor{totalFloors !== 1 ? "s" : ""}
                        <Dot />
                        {totalUnits} unit{totalUnits !== 1 ? "s" : ""}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="gap-0 p-6">
                <ChessboardGrid
                    floors={floors}
                    selectedUnit={selectedUnit}
                    hasActiveFilters={hasActiveFilters}
                    unitMatchesFilters={unitMatchesFilters}
                    onUnitClick={onUnitClick}
                />
            </CardContent>
        </Card>
    );
}