import {DoorOpenIcon} from "lucide-react";
import type {ApartmentSummary} from "@/features/deals/types/booking.types.ts";
import {UNIT_STATUS_CLASSES} from "@/features/units/types/unit.types.ts";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";
import {useTranslation} from "react-i18next";

/**
 * The unit being booked, in the same look as the unit sheet's summary: a
 * status-coloured tile, the unit number with its floor, rooms and area, and
 * the price.
 */
export function ApartmentCard({ apartment }: { apartment: ApartmentSummary }) {
    const { t } = useTranslation("deals");
    const { formatCurrency, formatArea } = useCompanyFormatters();

    return (
        <div className="flex items-center gap-3 rounded-lg border p-3">
            <span className={`icon-tile flex size-11 shrink-0 items-center justify-center ${UNIT_STATUS_CLASSES[apartment.status]}`}>
                <DoorOpenIcon className="size-5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                    <h4 className="font-semibold whitespace-nowrap">{t("unitCard.unitNumber", { number: apartment.number })}</h4>
                    <span className="text-lg font-bold whitespace-nowrap tabular-nums">{formatCurrency(apartment.price)}</span>
                </div>
                {/* Each item stays whole; the line wraps between them. */}
                <p className="flex flex-wrap gap-x-1.5 text-sm text-muted-foreground">
                    {[
                        t("unitCard.floor", { floor: apartment.floor }),
                        t("booking.rooms", { count: apartment.rooms }),
                        formatArea(apartment.area),
                    ].map((item, i) => (
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
