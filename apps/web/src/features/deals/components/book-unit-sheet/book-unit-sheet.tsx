import {useMemo, useState} from "react";
import {zodResolver} from "@hookform/resolvers/zod";
import {useForm} from "react-hook-form";
import {Sheet, SheetContent, SheetHeader, SheetTitle} from "@/components/ui/sheet";
import type {Unit} from "@/features/units/types/unit.types";
import type {Floor} from "@/features/floors/types/floor.types";
import {createClient} from "@/features/clients/api/clients.api";
import {ClientStep} from "./client-step";
import {ReservationStep} from "./reservation-step";
import {SummaryStep} from "./summary-step";
import {BookingFooter} from "./booking-footer";
import {ApartmentCard} from "./apartment-card";
import {buildBookingSchema, type BookingForm, type BookingFormInput} from "@/features/deals/schemas/booking.schema.ts";
import type {ApartmentSummary} from "@/features/deals/types/booking.types.ts";
import {useBookUnit} from "@/features/deals/hooks/use-book-unit.ts";
import type {Client} from "@/features/clients/types/client.types.ts";
import {useTranslation} from "react-i18next";

interface BookUnitSheetProps {
    unit: Unit;
    floor: Floor;
    projectId: string;
    managers: { id: string; fullName: string }[];
    open: boolean;
    onOpenChange(open: boolean): void;
}

const STEP_COUNT = 3;

const DEFAULT_VALUES: BookingFormInput = {
    clientMode: "existing",
    existingClientId: undefined,
    newClient: { fullName: "", phone: "", whatsapp: "", email: "", passport: "", pin: "" },
    reservation: {
        managerId: "",
        expiresAt: undefined as unknown as Date,
        discountPercent: 0,
        deposit: 0,
        note: "",
    },
};

export function BookUnitSheet({ unit, floor, projectId, managers, open, onOpenChange }: BookUnitSheetProps) {
    const { t } = useTranslation("deals");
    const [step, setStep] = useState(0);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [submitError, setSubmitError] = useState<string | undefined>();

    const apartment: ApartmentSummary = useMemo(
        () => ({
            id: unit.id,
            number: unit.number,
            floor: floor.number,
            block: unit.block?.name ?? "",
            entrance: unit.entrance?.name ?? "",
            rooms: unit.rooms ?? 0,
            area: Number(unit.area),
            price: Number(unit.price),
            pricePerSqm: Number(unit.area) > 0 ? Number(unit.price) / Number(unit.area) : 0,
            status: unit.status as ApartmentSummary["status"],
        }),
        [unit, floor],
    );

    // Rebuilt whenever the language changes, so a validation message that
    // fired before a language switch doesn't stay frozen in the old language.
    const bookingSchema = useMemo(() => buildBookingSchema(t), [t]);

    const form = useForm<BookingFormInput>({
        resolver: zodResolver(bookingSchema),
        defaultValues: DEFAULT_VALUES,
    });

    const reset = () => {
        form.reset(DEFAULT_VALUES);
        setStep(0);
        setSelectedClient(null);
        setSubmitError(undefined);
    };

    const bookMutation = useBookUnit({
        projectId,
        onSuccess: () => {
            reset();
            onOpenChange(false);
        },
    });

    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) reset();
        onOpenChange(isOpen);
    };

    const goNext = async () => {
        const fieldsToValidate: (keyof BookingForm)[] =
            step === 0 ? ["clientMode", "existingClientId", "newClient"] : ["reservation"];

        const valid = await form.trigger(fieldsToValidate);
        if (!valid) return;

        setStep((s) => Math.min(s + 1, STEP_COUNT - 1));
    };

    const goBack = () => {
        if (step === 0) {
            handleOpenChange(false);
            return;
        }
        setStep((s) => s - 1);
    };

    const handleSubmit = form.handleSubmit(async (values) => {
        setSubmitError(undefined);

        try {
            let clientId = values.existingClientId;

            if (values.clientMode === "new") {
                const client = await createClient({
                    fullName: values.newClient.fullName!,
                    phone: values.newClient.phone!,
                    whatsapp: values.newClient.whatsapp || undefined,
                    email: values.newClient.email || undefined,
                    passport: values.newClient.passport || undefined,
                    pin: values.newClient.pin || undefined,
                });
                clientId = client.id;
            }

            if (!clientId) {
                setSubmitError(t("booking.selectClientError"));
                return;
            }

            const discountAmount = apartment.price * (values.reservation.discountPercent / 100);

            await bookMutation.mutateAsync({
                unitId: unit.id,
                clientId,
                managerId: values.reservation.managerId,
                salePrice: apartment.price - discountAmount,
                discountPercent: values.reservation.discountPercent,
                deposit: values.reservation.deposit,
                reservationExpiresAt: values.reservation.expiresAt?.toISOString(),
                note: values.reservation.note || undefined,
            });
        } catch {
            setSubmitError(t("booking.reserveError"));
        }
    });

    const managerName = managers.find((m) => m.id === form.watch("reservation.managerId"))?.fullName;
    return (
        <Sheet open={open} onOpenChange={({ open }) => handleOpenChange(open)}>
            <SheetContent variant="inset" className="sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>{t("booking.sheetTitle", { number: unit.number })}</SheetTitle>
                </SheetHeader>

                <form
                    className="flex min-h-0 flex-1 flex-col"
                    onSubmit={(e) => e.preventDefault()}
                >
                    {step === 0 && (
                        <>
                            <div className="px-6">
                                <ApartmentCard apartment={apartment} />
                            </div>
                            <ClientStep form={form} selectedClient={selectedClient} onSelectClient={setSelectedClient} />
                        </>
                    )}
                    {step === 1 && <ReservationStep form={form} apartment={apartment} managers={managers} />}
                    {step === 2 && (
                        <SummaryStep
                            values={form.getValues()}
                            apartment={apartment}
                            selectedClient={selectedClient}
                            managerName={managerName}
                        />
                    )}

                    {submitError && <p className="px-4 text-sm text-destructive">{submitError}</p>}

                    <BookingFooter
                        step={step}
                        totalSteps={STEP_COUNT}
                        isSubmitting={bookMutation.isPending}
                        onBack={goBack}
                        onNext={goNext}
                        onSubmit={handleSubmit}
                    />
                </form>
            </SheetContent>
        </Sheet>
    );
}