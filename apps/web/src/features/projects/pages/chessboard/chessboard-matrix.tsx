import {useMemo, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {useQuery} from "@tanstack/react-query";
import {getProjectTree} from "@/features/projects/api/projects.api";
import {DoorOpen, Loader2Icon,} from "lucide-react";
import {type Unit, type UnitStatus, type UnitType} from "@/features/units/types/unit.types";
import {type Project} from "@/features/projects/types/project.types";
import type {Block} from "@/features/blocks/types/block.types";
import type {Entrance} from "@/features/entrances/types/entrance.types";
import {Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/components/ui/empty.tsx";
import {ChessboardBreadcrumbs} from "@/features/projects/components/chessboard/chessboard-breadcrumbs.tsx";
import {ChessboardFilters} from "@/features/projects/components/chessboard/chessboard-filters.tsx";
import {ChessboardCard} from "@/features/projects/components/chessboard/chessboard-card.tsx";
import {ChessboardSheets} from "@/features/projects/components/chessboard/sheets/chessboard-sheets.tsx";
import {useChessboardSheet} from "@/features/projects/hooks/use-chessboard-sheet.ts";
import {useUpdateUnit} from "@/features/units/hooks/use-update-unit.ts";
import {useManagers} from "@/features/users/hooks/use-managers.ts";
import {useTranslation} from "react-i18next";

interface Filters {
    status: UnitStatus | "all";
    type: UnitType | "all";
    rooms: string;
    areaMin: string;
    areaMax: string;
    priceMin: string;
    priceMax: string;
}

const DEFAULT_FILTERS: Filters = {
    status: "all",
    type: "all",
    rooms: "",
    areaMin: "",
    areaMax: "",
    priceMin: "",
    priceMax: "",
};

export function ChessboardMatrix() {
    const { t } = useTranslation("projects");
    const { projectId, blockId, entranceId } = useParams<{
        projectId: string;
        blockId: string;
        entranceId: string;
    }>();
    const navigate = useNavigate();

    const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

    const {
        sheet,
        actions,
    } = useChessboardSheet();

    const treeQuery = useQuery({
        queryKey: ["project-tree", projectId],
        queryFn: () => getProjectTree(projectId!),
        enabled: !!projectId,
    });

    const tree = treeQuery.data as Project | undefined;
    const block = tree?.blocks?.find((b: Block) => b.id === blockId);
    const entrance = block?.entrances?.find((e: Entrance) => e.id === entranceId);

    const blocks = tree?.blocks || [];
    const blockEntrances = block?.entrances || [];

    const managersQuery = useManagers();
    const managers = managersQuery.data ?? [];

    const updateUnitMutation = useUpdateUnit({
        projectId: projectId!,
        onSuccess: actions.close,
    });

    const hasActiveFilters =
        filters.status !== "all" ||
        filters.type !== "all" ||
        !!filters.rooms ||
        !!filters.areaMin ||
        !!filters.areaMax ||
        !!filters.priceMin ||
        !!filters.priceMax;

    const unitMatchesFilters = (unit: Unit) => {
        if (filters.status !== "all" && unit.status !== filters.status) {
            return false;
        }

        if (filters.type !== "all" && unit.type !== filters.type) {
            return false;
        }

        if (filters.rooms) {
            const rooms = parseInt(filters.rooms);

            if (!isNaN(rooms) && unit.rooms !== rooms) {
                return false;
            }
        }

        if (filters.areaMin) {
            const min = parseFloat(filters.areaMin);

            if (!isNaN(min) && parseFloat(unit.area) < min) {
                return false;
            }
        }

        if (filters.areaMax) {
            const max = parseFloat(filters.areaMax);

            if (!isNaN(max) && parseFloat(unit.area) > max) {
                return false;
            }
        }

        if (filters.priceMin) {
            const min = parseFloat(filters.priceMin);

            if (!isNaN(min) && parseFloat(unit.price) < min) {
                return false;
            }
        }

        if (filters.priceMax) {
            const max = parseFloat(filters.priceMax);

            if (!isNaN(max) && parseFloat(unit.price) > max) {
                return false;
            }
        }

        return true;
    };

    const matrixData = useMemo(() => {
        if (!entrance) {
            return null;
        }

        const sortedFloors = [...entrance.floors].sort(
            (first, second) => second.number - first.number
        );

        return {
            floors: sortedFloors,
            totalUnits: sortedFloors.reduce(
                (sum, floor) =>
                    sum + floor.units.filter(unitMatchesFilters).length,
                0
            ),
            totalFloors: sortedFloors.length,
        };
    }, [entrance, unitMatchesFilters]);

    const clearFilters = () => {
        setFilters(DEFAULT_FILTERS);
    };

    const selectedUnit =
        sheet.type === "details"
            ? sheet.unit
            : null;

    if (treeQuery.isLoading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!tree || !block || !entrance) {
        return (
            <div className="flex h-96 items-center justify-center text-muted-foreground">
                <p>{t("common:errors.notFound")}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <ChessboardBreadcrumbs
                block={block}
                entrance={entrance}
                blocks={blocks}
                blockEntrances={blockEntrances}
                onBack={() => navigate("..")}
                onBlockSelect={(id) => navigate(`../../${id}`)}
                onEntranceSelect={(id) => navigate(`../${id}`)}
            />

            <ChessboardFilters
                filters={filters}
                hasActiveFilters={hasActiveFilters}
                totalUnits={matrixData?.totalUnits || 0}
                onFiltersChange={setFilters}
                onClearFilters={clearFilters}
            />

            {matrixData && matrixData.floors.length > 0 ? (
                <ChessboardCard
                    entranceName={entrance.name}
                    floors={matrixData.floors}
                    totalFloors={matrixData.totalFloors}
                    totalUnits={matrixData.totalUnits}
                    selectedUnit={selectedUnit}
                    hasActiveFilters={hasActiveFilters}
                    unitMatchesFilters={unitMatchesFilters}
                    onUnitClick={(floor, unit) => actions.openDetails(unit, floor)}
                />
            ) : (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <DoorOpen strokeWidth={1.25} />
                        </EmptyMedia>
                        <EmptyTitle>{t("chessboard.noUnitsTitle")}</EmptyTitle>
                        <EmptyDescription>{t("chessboard.noUnitsDescription")}</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            )}

            <ChessboardSheets
                sheet={sheet}
                projectId={projectId!}
                managers={managers}
                updateState={{
                    isSubmitting: updateUnitMutation.isPending,
                    errorMessage: updateUnitMutation.isError
                        ? t("chessboard.updateUnitError")
                        : undefined,
                }}
                actions={{
                    close: actions.close,

                    edit: () => {
                        if (sheet.type !== "details") {
                            return;
                        }

                        actions.openEdit(sheet.unit);
                    },

                    book: () => {
                        if (sheet.type !== "details") {
                            return;
                        }

                        actions.openBooking(sheet.unit, sheet.floor);
                    },

                    update: (payload) => {
                        if (sheet.type !== "edit") {
                            return;
                        }

                        updateUnitMutation.mutate({
                            unitId: sheet.unit.id,
                            payload,
                        });
                    },
                }}
            />
        </div>
    );
}