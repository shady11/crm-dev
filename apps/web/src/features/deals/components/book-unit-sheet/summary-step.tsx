import {SheetBody} from "@/components/ui/sheet";
import {DataList, DataListItem, DataListItemLabel, DataListItemValue} from "@/components/ui/data-list";
import {ApartmentCard} from "./apartment-card";
import {calculateBooking} from "../../utils/booking-calculator";
import type {Client} from "@/features/clients/api/clients.api";
import type {BookingFormInput} from "@/features/deals/schemas/booking.schema.ts";
import type {ApartmentSummary} from "@/features/deals/types/booking.types.ts";

interface SummaryStepProps {
    values: BookingFormInput;
    apartment: ApartmentSummary;
    selectedClient: Client | null;
    managerName?: string;
}

export function SummaryStep({ values, apartment, selectedClient, managerName }: SummaryStepProps) {
    const calculation = calculateBooking({
        price: apartment.price,
        discountPercent: values.reservation.discountPercent,
        deposit: values.reservation.deposit,
    });

    const clientName = values.clientMode === "existing" ? selectedClient?.fullName : values.newClient.fullName;

    return (
        <SheetBody scrollFade>
            <div className="flex flex-col gap-4 py-4">
                <ApartmentCard apartment={apartment} />

                <DataList className="divide-y">
                    <DataListItem>
                        <DataListItemLabel>Client</DataListItemLabel>
                        <DataListItemValue>{clientName}</DataListItemValue>
                    </DataListItem>
                    <DataListItem>
                        <DataListItemLabel>Manager</DataListItemLabel>
                        <DataListItemValue>{managerName ?? "—"}</DataListItemValue>
                    </DataListItem>
                    <DataListItem>
                        <DataListItemLabel>Expires</DataListItemLabel>
                        <DataListItemValue>{values.reservation.expiresAt?.toLocaleDateString() ?? "—"}</DataListItemValue>
                    </DataListItem>
                    <DataListItem>
                        <DataListItemLabel>Final price</DataListItemLabel>
                        <DataListItemValue>{calculation.finalPrice.toLocaleString("en-US")} $</DataListItemValue>
                    </DataListItem>
                    <DataListItem>
                        <DataListItemLabel>Deposit</DataListItemLabel>
                        <DataListItemValue>{calculation.deposit.toLocaleString("en-US")} $</DataListItemValue>
                    </DataListItem>
                    <DataListItem>
                        <DataListItemLabel>Remaining</DataListItemLabel>
                        <DataListItemValue>{calculation.remaining.toLocaleString("en-US")} $</DataListItemValue>
                    </DataListItem>
                </DataList>

                {values.reservation.note && (
                    <div className="text-sm text-muted-foreground">
                        <p className="font-medium text-foreground">Note</p>
                        <p>{values.reservation.note}</p>
                    </div>
                )}
            </div>
        </SheetBody>
    );
}