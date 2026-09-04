import {HouseIcon} from "lucide-react";
import type {ApartmentSummary} from "@/features/deals/types/booking.types.ts";
import {Separator} from "@/components/ui/separator.tsx";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";

export function ApartmentCard({ apartment }: { apartment: ApartmentSummary }) {
    const { formatCurrency } = useCompanyFormatters();

    return (
        <div className="flex items-center gap-3 rounded-lg border border-secondary p-3">
            <div className="rounded-lg bg-muted p-2.5">
                <HouseIcon size={24} strokeWidth={1.25} className="text-primary" />
            </div>
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <h4 className="font-medium">Unit №{apartment.number}</h4>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    {apartment.floor}-floor
                    <Separator className="h-2.5 bg-muted-foreground/50" orientation="vertical" />
                    {apartment.rooms} rooms
                    <Separator className="h-2.5 bg-muted-foreground/50" orientation="vertical" />
                    {apartment.area.toFixed(1)} m²
                    <Separator className="h-2.5 bg-muted-foreground/50" orientation="vertical" />
                    {formatCurrency(apartment.price)}
                </div>
            </div>
        </div>
    );
}