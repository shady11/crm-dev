import type {ApartmentSummary} from "@/features/deals/types/booking.types.ts";
import {UnitStatus} from "@/features/units/types/unit.types.ts";
import {UnitSummary} from "@/features/units/components/unit-summary.tsx";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";
import {useTranslation} from "react-i18next";

/** The unit being booked, shown as in the unit sheet. */
export function ApartmentCard({ apartment, className }: { apartment: ApartmentSummary; className?: string }) {
    const { t } = useTranslation("deals");
    const { formatArea } = useCompanyFormatters();

    return (
        <UnitSummary
            className={className}
            status={apartment.status as UnitStatus}
            price={apartment.price}
            details={[
                t("unitCard.floor", { floor: apartment.floor }),
                t("booking.rooms", { count: apartment.rooms }),
                formatArea(apartment.area),
            ]}
        />
    );
}
