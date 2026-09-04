import {HouseIcon} from "lucide-react";
import type {ApartmentSummary} from "@/features/deals/types/booking.types.ts";
import {Separator} from "@/components/ui/separator.tsx";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";
import {useTranslation} from "react-i18next";

export function ApartmentCard({ apartment }: { apartment: ApartmentSummary }) {
    const { t } = useTranslation("deals");
    const { formatCurrency } = useCompanyFormatters();

    return (
        <div className="flex items-center gap-3 rounded-lg border border-secondary p-3">
            <div className="rounded-lg bg-muted p-2.5">
                <HouseIcon size={24} strokeWidth={1.25} className="text-primary" />
            </div>
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <h4 className="font-medium">{t("unitCard.unitNumber", { number: apartment.number })}</h4>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    {t("unitCard.floor", { floor: apartment.floor })}
                    <Separator className="h-2.5 bg-muted-foreground/50" orientation="vertical" />
                    {t("booking.rooms", { count: apartment.rooms })}
                    <Separator className="h-2.5 bg-muted-foreground/50" orientation="vertical" />
                    {apartment.area.toFixed(1)} m²
                    <Separator className="h-2.5 bg-muted-foreground/50" orientation="vertical" />
                    {formatCurrency(apartment.price)}
                </div>
            </div>
        </div>
    );
}