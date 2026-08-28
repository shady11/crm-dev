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
    UNIT_STATUS_LABEL_KEYS,
    UNIT_STATUS_VALUES,
} from "@/features/units/types/unit.types";
import {useTranslation} from "react-i18next";

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
    const { t } = useTranslation("units");

    const statusCollection = createListCollection({
        items: UNIT_STATUS_VALUES.map((status) => ({
            label: t(UNIT_STATUS_LABEL_KEYS[status]),
            value: status,
        })),
    });

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