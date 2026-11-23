import {cn} from "@/lib/utils";
import {type Unit, UNIT_STATUS_CLASSES, UNIT_TYPE_LABEL_KEYS} from "@/features/units/types/unit.types";
import {useTranslation} from "react-i18next";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";

interface MatrixUnitCardProps {
    unit: Unit;
    selected?: boolean;
    dimmed?: boolean;
    onClick?: () => void;
}

export function ChessboardUnitCard({
                                       unit,
                                       selected,
                                       dimmed,
                                       onClick,
                                   }: MatrixUnitCardProps) {
    const { t } = useTranslation("units");
    const { formatCurrency, formatPricePerSqm, formatArea } = useCompanyFormatters();
    const price = Number(unit.price);
    const area = Number(unit.area);

    const pricePerSqM =
        area > 0
            ? Math.round(price / area)
            : 0;

    // A soft tile: a faint wash and a stripe of the status colour, the same
    // colours as the legend, with the figures in the normal text colour.
    return (
        <button
            onClick={onClick}
            className={cn(
                "relative flex h-full min-w-52 cursor-pointer flex-col items-start justify-center gap-1 overflow-hidden rounded-[8px] border bg-card py-2 ps-3.5 pe-2.5 text-left",
                "transition-all duration-300 hover:-translate-y-px hover:shadow-md",
                dimmed && "opacity-25",
                selected && "opacity-100 ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg"
            )}
        >
            <span aria-hidden className={cn("pointer-events-none absolute inset-0 opacity-[0.14]", UNIT_STATUS_CLASSES[unit.status])} />
            <span aria-hidden className={cn("pointer-events-none absolute inset-y-0 start-0 w-1", UNIT_STATUS_CLASSES[unit.status])} />
            <div className="relative flex w-full items-center justify-between gap-6 text-xs text-muted-foreground">
                {/* Commercial space, parking and storage have no rooms:
                    the label read "комнат" with no number. */}
                <span>
                    {unit.rooms != null ? t("chessboard.rooms", { count: unit.rooms }) : null}
                </span>
                <span className="font-medium text-foreground">
                    №{unit.number}
                </span>
            </div>
            <div className="relative flex w-full items-baseline justify-between gap-4">
                <span className="text-base font-semibold tabular-nums">
                    {formatCurrency(parseFloat(unit.price))}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                    {formatPricePerSqm(pricePerSqM)}
                </span>
            </div>
            <div className="relative flex w-full items-center justify-between gap-6 text-xs text-muted-foreground">
                <span>
                    {t(UNIT_TYPE_LABEL_KEYS[unit.type])}
                </span>
                <span>
                    {formatArea(unit.area)}
                </span>
            </div>
        </button>
    );
}
