import {DoorOpenIcon} from "lucide-react";
import {useTranslation} from "react-i18next";
import {Badge} from "@/components/ui/badge.tsx";
import {UNIT_STATUS_CLASSES, UNIT_STATUS_LABEL_KEYS, type UnitStatus} from "@/features/units/types/unit.types.ts";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";

interface UnitSummaryProps {
    status: UnitStatus;
    price: number;
    /** Short facts under the price, e.g. rooms, type and area; joined with dots. */
    details: string[];
    className?: string;
}

/**
 * A unit at a glance: a tile in its status colour, the price, the status and
 * a line of short facts. Used by the unit sheet and the booking sheet.
 */
export function UnitSummary({status, price, details, className}: UnitSummaryProps) {
    const {t} = useTranslation("units");
    const {formatCurrency} = useCompanyFormatters();

    return (
        <div className={`flex items-center gap-4 ${className ?? ""}`}>
            <span className={`icon-tile flex size-12 shrink-0 items-center justify-center ${UNIT_STATUS_CLASSES[status]}`}>
                <DoorOpenIcon className="size-6" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-2xl font-bold tabular-nums">{formatCurrency(price)}</span>
                    <Badge className={UNIT_STATUS_CLASSES[status]}>
                        {t(UNIT_STATUS_LABEL_KEYS[status])}
                    </Badge>
                </div>
                {/* Each fact stays whole; the line wraps between them. */}
                <p className="flex flex-wrap gap-x-1.5 text-sm text-muted-foreground">
                    {details.map((item, i) => (
                        <span key={i} className="whitespace-nowrap">
                            {i > 0 && <span aria-hidden className="me-1.5">·</span>}
                            {item}
                        </span>
                    ))}
                </p>
            </div>
        </div>
    );
}
