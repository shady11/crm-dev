import {useMemo, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {keepPreviousData, useQuery} from "@tanstack/react-query";
import {getProjectChessboard} from "@/features/projects/api/projects.api";
import {DoorOpen, Loader2Icon,} from "lucide-react";
import {type UnitStatus, type UnitType} from "@/features/units/types/unit.types";
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

    // Unfiltered, project-wide structure — used only for the breadcrumb's
    // block/entrance switchers, which must keep listing every block and
    // entrance regardless of what the unit-level filters below exclude.
    const navQuery = useQuery({
        queryKey: ["project-chessboard", projectId],
        queryFn: () => getProjectChessboard(projectId!),
        enabled: !!projectId,
    });

    const blocks = (navQuery.data?.blocks ?? []) as Block[];
    const block = blocks.find((b: Block) => b.id === blockId);
    const blockEntrances = block?.entrances || [];
    const entranceMeta = blockEntrances.find((e: Entrance) => e.id === entranceId);

    const hasActiveFilters =
        filters.status !== "all" ||
        filters.type !== "all" ||
        !!filters.rooms ||
        !!filters.areaMin ||
        !!filters.areaMax ||
        !!filters.priceMin ||
        !!filters.priceMax;

    const apiFilters = useMemo(
        () => ({
            blockId,
            entranceId,
            type: filters.type !== "all" ? filters.type : undefined,
            status: filters.status !== "all" ? filters.status : undefined,
            rooms: filters.rooms ? Number(filters.rooms) : undefined,
            areaMin: filters.areaMin ? Number(filters.areaMin) : undefined,
            areaMax: filters.areaMax ? Number(filters.areaMax) : undefined,
            priceMin: filters.priceMin ? Number(filters.priceMin) : undefined,
            priceMax: filters.priceMax ? Number(filters.priceMax) : undefined,
        }),
        [blockId, entranceId, filters],
    );

    // The actual matrix content — filtering happens on the backend, so the
    // grid only ever receives units that already match the active filters.
    const matrixQuery = useQuery({
        queryKey: ["project-chessboard", projectId, apiFilters],
        queryFn: () => getProjectChessboard(projectId!, apiFilters),
        enabled: !!projectId && !!blockId && !!entranceId,
        placeholderData: keepPreviousData,
    });

    const filteredEntrance = matrixQuery.data?.blocks?.[0]?.entrances?.[0];

    const managersQuery = useManagers();
    const managers = managersQuery.data ?? [];

    const updateUnitMutation = useUpdateUnit({
        projectId: projectId!,
        onSuccess: actions.close,
    });

    const matrixData = useMemo(() => {
        if (!filteredEntrance) {
            return null;
        }

        const sortedFloors = [...filteredEntrance.floors].sort(
            (first: {number: number}, second: {number: number}) => second.number - first.number
        );

        return {
            floors: sortedFloors,
            totalUnits: sortedFloors.reduce(
                (sum: number, floor: {units: unknown[]}) => sum + floor.units.length,
                0
            ),
            totalFloors: sortedFloors.length,
        };
    }, [filteredEntrance]);

    const clearFilters = () => {
        setFilters(DEFAULT_FILTERS);
    };

    const selectedUnit =
        sheet.type === "details"
            ? sheet.unit
            : null;

    if (navQuery.isLoading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!block || !entranceMeta) {
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
                entrance={entranceMeta}
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

            {matrixQuery.isLoading ? (
                <div className="flex h-64 items-center justify-center">
                    <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : matrixData && matrixData.floors.length > 0 ? (
                <ChessboardCard
                    entranceName={entranceMeta.name}
                    floors={matrixData.floors}
                    totalFloors={matrixData.totalFloors}
                    totalUnits={matrixData.totalUnits}
                    selectedUnit={selectedUnit}
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
