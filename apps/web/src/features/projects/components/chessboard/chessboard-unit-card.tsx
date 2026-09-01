import {cn} from "@/lib/utils";
import {type Unit, UNIT_STATUS_CLASSES, UNIT_TYPE_LABEL_KEYS} from "@/features/units/types/unit.types";
import {useTranslation} from "react-i18next";

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
    const price = Number(unit.price);
    const area = Number(unit.area);

    const pricePerSqM =
        area > 0
            ? Math.round(price / area)
            : 0;

    return (
        <button
            onClick={onClick}
            className={cn(
                "flex flex-col items-start justify-center p-2 gap-1 rounded-md cursor-pointer text-white",
                "hover:ring-2 hover:ring-primary ring-offset-1 transition-all duration-500",
                UNIT_STATUS_CLASSES[unit.status],
                dimmed && "opacity-20",
                selected &&
                "ring-2 ring-primary ring-offset-2 shadow-lg opacity-100 grayscale-0"
            )}
        >
            <div className="flex items-center justify-between w-full gap-8 text-xs">
                <span>
                    {unit.rooms} rooms
                </span>
                <span>
                    №{unit.number}
                </span>
            </div>
            <div className="flex items-center justify-start w-full gap-4 text-xs font-medium">
                <span className="text-lg">
                    {parseFloat(unit.price).toLocaleString('en-US', { maximumFractionDigits: 0 })} $
                </span>
                <span>
                    {pricePerSqM} $/m²
                </span>
            </div>
            <div className="flex items-center justify-between w-full gap-8 text-xs">
                <span>
                    {t(UNIT_TYPE_LABEL_KEYS[unit.type])}
                </span>
                <span>
                    {parseFloat(unit.area).toFixed(0)} m²
                </span>
            </div>
        </button>
    );
}