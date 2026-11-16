import {useEffect} from "react";
import {Controller, type UseFormReturn} from "react-hook-form";
import {createListCollection} from "@ark-ui/react";
import {DateField} from "@/components/shared/date-field";
import {Field, FieldDescription, FieldError, FieldGroup, FieldLabel} from "@/components/ui/field";
import {SheetBody} from "@/components/ui/sheet";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {NumberInput, NumberInputGroup, NumberInputInput} from "@/components/ui/number-input";
import {Textarea} from "@/components/ui/textarea";
import type {BookingFormInput} from "@/features/deals/schemas/booking.schema.ts";
import type {ApartmentSummary} from "@/features/deals/types/booking.types.ts";
import {calculateBooking, discountNeedsApproval} from "@/features/deals/utils/booking-calculator.ts";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";
import {useTranslation} from "react-i18next";
import {useReservationPolicy} from "@/features/deals/hooks/use-reservation-policy.ts";
import {defaultReservationExpiry, reservationDateBounds} from "@/features/deals/utils/reservation-dates.ts";
import {useQuery} from "@tanstack/react-query";
import {TriangleAlertIcon} from "lucide-react";
import {useAuth} from "@/features/auth/hooks/use-auth.ts";
import {getDiscountApprovers} from "@/features/deals/api/deals.api.ts";
import {FINANCING_TYPE_LABEL_KEYS} from "@/features/deals/types/deal.types.ts";
import {PAYMENT_METHOD_LABEL_KEYS} from "@/features/deals/components/deal-details/deal-payments-history-card.tsx";

const FINANCING_TYPES = ["CASH", "INSTALLMENT", "MORTGAGE"] as const;
const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "MBANK", "OPTIMA", "ELKART", "OTHER"] as const;

interface Manager {
    id: string;
    fullName: string;
}

interface ReservationStepProps {
    form: UseFormReturn<BookingFormInput>;
    apartment: ApartmentSummary;
    managers: Manager[];
    /** False books in the signed-in user's own name, with no picker shown. */
    canChooseManager: boolean;
    /** The client being booked for, which decides whose approval a discount needs. */
    clientId?: string;
}

export function ReservationStep({ form, apartment, managers, canChooseManager, clientId }: ReservationStepProps) {
    const { t } = useTranslation(["deals", "payments"]);
    const { user } = useAuth();
    const { formatCurrency, currencyCode } = useCompanyFormatters();
    const policy = useReservationPolicy().data;
    const expiryBounds = policy ? reservationDateBounds(policy) : undefined;

    // Pre-fill the company's default term so the common case needs no input.
    useEffect(() => {
        if (policy && !form.getValues("reservation.expiresAt")) {
            form.setValue("reservation.expiresAt", defaultReservationExpiry(policy));
        }
    }, [policy, form]);
    const discountPercent = form.watch("reservation.discountPercent") || 0;
    const deposit = form.watch("reservation.deposit") || 0;

    const calculation = calculateBooking({ price: apartment.price, discountPercent, deposit });

    const needsApproval = discountNeedsApproval(discountPercent, user?.discountLimit);
    const approvers = useQuery({
        queryKey: ["discount-approvers", discountPercent, clientId],
        queryFn: () => getDiscountApprovers(discountPercent, clientId),
        enabled: needsApproval,
        staleTime: 60_000,
    });
    const approverNames = (approvers.data?.approvers ?? []).map((a) => a.fullName).join(", ");

    const financingCollection = createListCollection({
        items: FINANCING_TYPES.map((value) => ({ label: t(FINANCING_TYPE_LABEL_KEYS[value]), value })),
    });
    const methodCollection = createListCollection({
        items: PAYMENT_METHODS.map((value) => ({ label: t(PAYMENT_METHOD_LABEL_KEYS[value]), value })),
    });

    const managerCollection = createListCollection({
        items: managers.map((m) => ({ label: m.fullName, value: m.id })),
    });

    return (
        <SheetBody scrollFade>
            <FieldGroup className="gap-5 py-4">
                {canChooseManager && (
                    <Controller
                        control={form.control}
                        name="reservation.managerId"
                        render={({ field, fieldState }) => (
                            <Field invalid={fieldState.invalid} orientation="responsive">
                                <FieldLabel>{t("booking.manager")}</FieldLabel>
                                <Select
                                    collection={managerCollection}
                                    value={field.value ? [field.value] : []}
                                    onValueChange={(item) => field.onChange(item.value[0])}
                                >
                                    <SelectTrigger className="w-full min-w-32">
                                        <SelectValue placeholder={t("booking.selectManager")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {managerCollection.items.map((item) => (
                                            <SelectItem key={item.value} item={item}>
                                                {item.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FieldError>{fieldState.error?.message}</FieldError>
                            </Field>
                        )}
                    />
                )}

                <Controller
                    control={form.control}
                    name="reservation.expiresAt"
                    render={({ field, fieldState }) => (
                        <Field invalid={fieldState.invalid}>
                            <FieldLabel>{t("booking.reservationExpires")}</FieldLabel>
                            <DateField
                                value={field.value ? field.value.toISOString().slice(0, 10) : ""}
                                onChange={(value) => field.onChange(value ? new Date(value) : undefined)}
                                min={expiryBounds?.min}
                                max={expiryBounds?.max}
                            />
                            {policy && (
                                <FieldDescription>
                                    {t("booking.reservationExpiresHint", {
                                        defaultDays: policy.reservationDefaultDays,
                                        maxDays: policy.reservationMaxDays,
                                    })}
                                </FieldDescription>
                            )}
                            <FieldError>{fieldState.error?.message}</FieldError>
                        </Field>
                    )}
                />

                <Controller
                    control={form.control}
                    name="reservation.financingType"
                    render={({ field, fieldState }) => (
                        <Field invalid={fieldState.invalid}>
                            <FieldLabel>{t("booking.financingType")}</FieldLabel>
                            <Select
                                collection={financingCollection}
                                value={field.value ? [field.value] : []}
                                onValueChange={(item) => field.onChange(item.value[0])}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder={t("booking.selectFinancing")} />
                                </SelectTrigger>
                                <SelectContent>
                                    {financingCollection.items.map((item) => (
                                        <SelectItem key={item.value} item={item}>{item.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FieldDescription>{t("booking.financingHint")}</FieldDescription>
                            <FieldError>{fieldState.error?.message}</FieldError>
                        </Field>
                    )}
                />

                <Controller
                    control={form.control}
                    name="reservation.discountPercent"
                    render={({ field, fieldState }) => (
                        <Field invalid={fieldState.invalid}>
                            <FieldLabel>{t("booking.discountPercent")}</FieldLabel>
                            <NumberInput
                                value={field.value?.toString() ?? "0"}
                                min={0}
                                max={100}
                                onValueChange={({ valueAsNumber }) => field.onChange(Number.isNaN(valueAsNumber) ? 0 : valueAsNumber)}
                            >
                                <NumberInputGroup>
                                    <NumberInputInput />
                                </NumberInputGroup>
                            </NumberInput>
                            {needsApproval && (
                                <p role="status" className="flex gap-2 rounded-md bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                                    <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
                                    <span>
                                        {approverNames
                                            ? t("booking.discountNeedsApprovalBy", { limit: user?.discountLimit ?? 0, approvers: approverNames })
                                            : t("booking.discountNeedsApproval", { limit: user?.discountLimit ?? 0 })}
                                    </span>
                                </p>
                            )}
                            <FieldError>{fieldState.error?.message}</FieldError>
                        </Field>
                    )}
                />

                <Controller
                    control={form.control}
                    name="reservation.deposit"
                    render={({ field, fieldState }) => (
                        <Field invalid={fieldState.invalid}>
                            <FieldLabel>{t("booking.deposit", { currency: currencyCode })}</FieldLabel>
                            <NumberInput
                                value={field.value?.toString() ?? "0"}
                                min={0}
                                onValueChange={({ valueAsNumber }) => field.onChange(Number.isNaN(valueAsNumber) ? 0 : valueAsNumber)}
                            >
                                <NumberInputGroup>
                                    <NumberInputInput />
                                </NumberInputGroup>
                            </NumberInput>
                            <FieldError>{fieldState.error?.message}</FieldError>
                        </Field>
                    )}
                />

                {deposit > 0 && (
                    <Controller
                        control={form.control}
                        name="reservation.depositPaymentMethod"
                        render={({ field, fieldState }) => (
                            <Field invalid={fieldState.invalid}>
                                <FieldLabel>{t("booking.depositMethod")}</FieldLabel>
                                <Select
                                    collection={methodCollection}
                                    value={field.value ? [field.value] : []}
                                    onValueChange={(item) => field.onChange(item.value[0])}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder={t("booking.selectDepositMethod")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {methodCollection.items.map((item) => (
                                            <SelectItem key={item.value} item={item}>{item.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FieldError>{fieldState.error?.message}</FieldError>
                            </Field>
                        )}
                    />
                )}

                <Controller
                    control={form.control}
                    name="reservation.note"
                    render={({ field, fieldState }) => (
                        <Field invalid={fieldState.invalid}>
                            <FieldLabel>{t("booking.noteOptional")}</FieldLabel>
                            <Textarea {...field} rows={3} />
                            <FieldError>{fieldState.error?.message}</FieldError>
                        </Field>
                    )}
                />

                <div className="space-y-1 rounded-lg border border-secondary p-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("booking.listPrice")}</span>
                        <span>{formatCurrency(calculation.price)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("booking.discount")}</span>
                        <span>
                            {calculation.discountAmount > 0 && `- ${formatCurrency(calculation.discountAmount)}`}
                        </span>
                    </div>
                    <div className="flex justify-between font-medium">
                        <span>{needsApproval ? t("booking.finalPriceIfApproved") : t("booking.finalPrice")}</span>
                        <span>{formatCurrency(calculation.finalPrice)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("booking.depositPlain")}</span>
                        <span>{formatCurrency(calculation.deposit)}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                        <span>{t("booking.remaining")}</span>
                        <span>{formatCurrency(calculation.remaining)}</span>
                    </div>
                </div>
            </FieldGroup>
        </SheetBody>
    );
}