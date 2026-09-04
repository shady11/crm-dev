import {Controller, type UseFormReturn} from "react-hook-form";
import {createListCollection} from "@ark-ui/react";
import {Field, FieldError, FieldGroup, FieldLabel} from "@/components/ui/field";
import {SheetBody} from "@/components/ui/sheet";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {NumberInput, NumberInputGroup, NumberInputInput} from "@/components/ui/number-input";
import {Textarea} from "@/components/ui/textarea";
import type {BookingFormInput} from "@/features/deals/schemas/booking.schema.ts";
import type {ApartmentSummary} from "@/features/deals/types/booking.types.ts";
import {calculateBooking} from "@/features/deals/utils/booking-calculator.ts";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";

interface Manager {
    id: string;
    fullName: string;
}

interface ReservationStepProps {
    form: UseFormReturn<BookingFormInput>;
    apartment: ApartmentSummary;
    managers: Manager[];
}

export function ReservationStep({ form, apartment, managers }: ReservationStepProps) {
    const { formatCurrency, currencyCode } = useCompanyFormatters();
    const discountPercent = form.watch("reservation.discountPercent") || 0;
    const deposit = form.watch("reservation.deposit") || 0;

    const calculation = calculateBooking({ price: apartment.price, discountPercent, deposit });

    const managerCollection = createListCollection({
        items: managers.map((m) => ({ label: m.fullName, value: m.id })),
    });

    return (
        <SheetBody scrollFade>
            <FieldGroup className="gap-5 py-4">
                <Controller
                    control={form.control}
                    name="reservation.managerId"
                    render={({ field, fieldState }) => (
                        <Field invalid={fieldState.invalid} orientation="responsive">
                            <FieldLabel>Manager</FieldLabel>
                            <Select
                                collection={managerCollection}
                                value={field.value ? [field.value] : []}
                                onValueChange={(item) => field.onChange(item.value[0])}
                            >
                                <SelectTrigger className="w-full min-w-32">
                                    <SelectValue placeholder="Select manager" />
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

                <Controller
                    control={form.control}
                    name="reservation.expiresAt"
                    render={({ field, fieldState }) => (
                        <Field invalid={fieldState.invalid}>
                            <FieldLabel>Reservation expires</FieldLabel>
                            <input
                                type="date"
                                className="h-9 rounded-md border px-3 text-sm"
                                value={field.value ? field.value.toISOString().slice(0, 10) : ""}
                                onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                            />
                            <FieldError>{fieldState.error?.message}</FieldError>
                        </Field>
                    )}
                />

                <Controller
                    control={form.control}
                    name="reservation.discountPercent"
                    render={({ field, fieldState }) => (
                        <Field invalid={fieldState.invalid}>
                            <FieldLabel>Discount (%)</FieldLabel>
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
                            <FieldError>{fieldState.error?.message}</FieldError>
                        </Field>
                    )}
                />

                <Controller
                    control={form.control}
                    name="reservation.deposit"
                    render={({ field, fieldState }) => (
                        <Field invalid={fieldState.invalid}>
                            <FieldLabel>Deposit ({currencyCode})</FieldLabel>
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

                <Controller
                    control={form.control}
                    name="reservation.note"
                    render={({ field, fieldState }) => (
                        <Field invalid={fieldState.invalid}>
                            <FieldLabel>Note (optional)</FieldLabel>
                            <Textarea {...field} rows={3} />
                            <FieldError>{fieldState.error?.message}</FieldError>
                        </Field>
                    )}
                />

                <div className="space-y-1 rounded-lg border border-secondary p-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">List price</span>
                        <span>{formatCurrency(calculation.price)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Discount</span>
                        <span>
                            {calculation.discountAmount > 0 && `- ${formatCurrency(calculation.discountAmount)}`}
                        </span>
                    </div>
                    <div className="flex justify-between font-medium">
                        <span>Final price</span>
                        <span>{formatCurrency(calculation.finalPrice)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Deposit</span>
                        <span>{formatCurrency(calculation.deposit)}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                        <span>Remaining</span>
                        <span>{formatCurrency(calculation.remaining)}</span>
                    </div>
                </div>
            </FieldGroup>
        </SheetBody>
    );
}