import {ChevronLeftIcon, ChevronRightIcon, Dot} from "lucide-react";
import {useEffect, useRef, useState} from "react";
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
import {namedLabel} from "@/lib/i18n/named-label.ts";

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
    const scroller = useRef<HTMLDivElement>(null);
    const [more, setMore] = useState({left: false, right: false});

    // Whether units are off to either side. A floor stays on one row, so a
    // wide entrance scrolls sideways; the right-hand units were cut off with
    // no sign that more were there (macOS and many browsers hide scrollbars
    // until you scroll).
    useEffect(() => {
        const el = scroller.current;
        if (!el) return;
        const update = () => setMore({
            left: el.scrollLeft > 1,
            right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
        });
        update();
        el.addEventListener("scroll", update, {passive: true});
        const observer = new ResizeObserver(update);
        observer.observe(el);
        if (el.firstElementChild) observer.observe(el.firstElementChild);
        return () => {
            el.removeEventListener("scroll", update);
            observer.disconnect();
        };
    }, [floors]);

    const scrollBy = (direction: 1 | -1) =>
        scroller.current?.scrollBy({left: direction * scroller.current.clientWidth * 0.8, behavior: "smooth"});

    const statusCollection = createListCollection({
        items: UNIT_STATUS_VALUES.map((status) => ({
            label: t(UNIT_STATUS_LABEL_KEYS[status]),
            value: status,
        })),
    });

    return (
        <Card className="gap-0 overflow-hidden p-0">
            <CardHeader className="gap-0 border-b py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-semibold">{namedLabel(t, "chessboard.entranceLabel", entranceName)}</h3>

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
                        {t("chessboard.floors", { count: totalFloors })}
                        <Dot />
                        {t("chessboard.units", { count: totalUnits })}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="gap-0 p-4 sm:p-6">
                {/* Floor numbers stay put while the units scroll sideways. */}
                <div className="flex gap-3">
                    <div className="flex shrink-0 flex-col gap-3 py-1">
                        {floors.map((floor) => (
                            <span
                                key={floor.id}
                                className="flex h-22 w-11 items-center justify-center rounded-[8px] border bg-card text-sm font-semibold tabular-nums text-muted-foreground"
                            >
                                {floor.number}
                            </span>
                        ))}
                    </div>
                    <div className="relative min-w-0 flex-1">
                        {/* Units running off either edge fade out rather than being cut. */}
                        <div
                            ref={scroller}
                            className="w-full overflow-x-auto px-1 pt-1 pb-3"
                            style={{
                                maskImage: more.left || more.right
                                    ? `linear-gradient(to right, ${more.left ? "transparent, black 4rem" : "black"}, ${more.right ? "black calc(100% - 4rem), transparent" : "black"})`
                                    : undefined,
                            }}
                        >
                            <ChessboardGrid
                                floors={floors}
                                selectedUnit={selectedUnit}
                                hasActiveFilters={hasActiveFilters}
                                unitMatchesFilters={unitMatchesFilters}
                                onUnitClick={onUnitClick}
                            />
                        </div>
                        {more.left ? (
                            <div className="pointer-events-none absolute inset-y-0 left-0 z-20 flex w-16 items-center justify-start">
                                <button
                                    type="button"
                                    aria-label={t("chessboard.scrollLeft")}
                                    onClick={() => scrollBy(-1)}
                                    className="pointer-events-auto flex size-9 items-center justify-center rounded-full border bg-card shadow-sm hover:bg-secondary"
                                >
                                    <ChevronLeftIcon className="size-4" />
                                </button>
                            </div>
                        ) : null}
                        {more.right ? (
                            <div className="pointer-events-none absolute inset-y-0 right-0 z-20 flex w-16 items-center justify-end">
                                <button
                                    type="button"
                                    aria-label={t("chessboard.scrollRight")}
                                    onClick={() => scrollBy(1)}
                                    className="pointer-events-auto flex size-9 items-center justify-center rounded-full border bg-card shadow-sm hover:bg-secondary"
                                >
                                    <ChevronRightIcon className="size-4" />
                                </button>
                            </div>
                        ) : null}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}