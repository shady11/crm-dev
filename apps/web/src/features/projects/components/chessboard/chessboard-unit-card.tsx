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

    // Filled with the status colour, as in the legend, with white figures.
    return (
        <button
            onClick={onClick}
            className={cn(
                "relative flex h-full min-w-52 cursor-pointer flex-col items-start justify-center gap-1 overflow-hidden rounded-[8px] px-3 py-2 text-left text-white",
                UNIT_STATUS_CLASSES[unit.status],
                "transition-all duration-300 hover:-translate-y-px hover:shadow-md",
                dimmed && "opacity-25",
                selected && "opacity-100 ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg"
            )}
        >
            <div className="relative flex w-full items-center justify-between gap-6 text-xs text-white/85">
                {/* Commercial space, parking and storage have no rooms:
                    the label read "комнат" with no number. */}
                <span>
                    {unit.rooms != null ? t("chessboard.rooms", { count: unit.rooms }) : null}
                </span>
                <span className="font-medium">
                    №{unit.number}
                </span>
            </div>
            <div className="relative flex w-full items-baseline justify-between gap-4">
                <span className="text-base font-semibold tabular-nums">
                    {formatCurrency(parseFloat(unit.price))}
                </span>
                <span className="text-xs text-white/85 tabular-nums">
                    {formatPricePerSqm(pricePerSqM)}
                </span>
            </div>
            <div className="relative flex w-full items-center justify-between gap-6 text-xs text-white/85">
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
