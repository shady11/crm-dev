import {SheetBody} from "@/components/ui/sheet";
import {DataList, DataListItem, DataListItemLabel, DataListItemValue} from "@/components/ui/data-list";
import {ApartmentCard} from "./apartment-card";
import {calculateBooking, discountNeedsApproval} from "../../utils/booking-calculator";
import type {BookingFormInput} from "@/features/deals/schemas/booking.schema.ts";
import type {ApartmentSummary} from "@/features/deals/types/booking.types.ts";
import type {Client} from "@/features/clients/types/client.types.ts";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";
import {useTranslation} from "react-i18next";
import {useAuth} from "@/features/auth/hooks/use-auth.ts";
import {FINANCING_TYPE_LABEL_KEYS} from "@/features/deals/types/deal.types.ts";
import {PAYMENT_METHOD_LABEL_KEYS} from "@/features/deals/components/deal-details/deal-payments-history-card.tsx";
import {formatDay} from "@/utils/date-formatter.ts";

interface SummaryStepProps {
    values: BookingFormInput;
    apartment: ApartmentSummary;
    selectedClient: Client | null;
    managerName?: string;
}

export function SummaryStep({ values, apartment, selectedClient, managerName }: SummaryStepProps) {
    const { t } = useTranslation(["deals", "payments"]);
    const { user } = useAuth();
    const needsApproval = discountNeedsApproval(values.reservation.discountPercent, user?.discountLimit);
    const method = values.reservation.depositPaymentMethod;
    const financing = values.reservation.financingType;
    const { formatCurrency } = useCompanyFormatters();
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
                        <DataListItemLabel>{t("booking.client")}</DataListItemLabel>
                        <DataListItemValue>{clientName}</DataListItemValue>
                    </DataListItem>
                    <DataListItem>
                        <DataListItemLabel>{t("booking.manager")}</DataListItemLabel>
                        <DataListItemValue>{managerName ?? "—"}</DataListItemValue>
                    </DataListItem>
                    <DataListItem>
                        <DataListItemLabel>{t("booking.expires")}</DataListItemLabel>
                        <DataListItemValue>{(values.reservation.expiresAt ? formatDay(values.reservation.expiresAt) : "—")}</DataListItemValue>
                    </DataListItem>
                    <DataListItem>
                        <DataListItemLabel>{t("booking.financingType")}</DataListItemLabel>
                        <DataListItemValue>{financing ? t(FINANCING_TYPE_LABEL_KEYS[financing]) : "—"}</DataListItemValue>
                    </DataListItem>
                    <DataListItem>
                        <DataListItemLabel>{needsApproval ? t("booking.finalPriceIfApproved") : t("booking.finalPrice")}</DataListItemLabel>
                        <DataListItemValue>{formatCurrency(calculation.finalPrice)}</DataListItemValue>
                    </DataListItem>
                    <DataListItem>
                        <DataListItemLabel>{t("booking.depositPlain")}</DataListItemLabel>
                        <DataListItemValue>
                            {formatCurrency(calculation.deposit)}
                            {calculation.deposit > 0 && method ? ` · ${t(PAYMENT_METHOD_LABEL_KEYS[method])}` : null}
                        </DataListItemValue>
                    </DataListItem>
                    <DataListItem>
                        <DataListItemLabel>{t("booking.remaining")}</DataListItemLabel>
                        <DataListItemValue>{formatCurrency(calculation.remaining)}</DataListItemValue>
                    </DataListItem>
                </DataList>

                {needsApproval && (
                    <p role="status" className="rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                        {t("booking.summaryApprovalNote", { percent: values.reservation.discountPercent, listPrice: formatCurrency(apartment.price) })}
                    </p>
                )}

                {values.reservation.note && (
                    <div className="text-sm text-muted-foreground">
                        <p className="font-medium text-foreground">{t("booking.note")}</p>
                        <p>{values.reservation.note}</p>
                    </div>
                )}
            </div>
        </SheetBody>
    );
}