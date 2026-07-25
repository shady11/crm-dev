import {Controller, type UseFormReturn} from "react-hook-form";
import {Field, FieldError, FieldGroup, FieldLabel} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {SheetBody} from "@/components/ui/sheet";
import {ClientSearch} from "@/features/clients/components/client-search";
import {ClientCard} from "@/features/clients/components/client-card";
import type {BookingFormInput} from "@/features/deals/schemas/booking.schema.ts";
import type {Client} from "@/features/clients/types/client.types.ts";

interface ClientStepProps {
    form: UseFormReturn<BookingFormInput>;
    selectedClient: Client | null;
    onSelectClient(client: Client | null): void;
}

export function ClientStep({ form, selectedClient, onSelectClient }: ClientStepProps) {
    const clientMode = form.watch("clientMode");

    return (
        <SheetBody scrollFade>
            <FieldGroup className="gap-5 py-4">
                <div className="flex gap-2">
                    <button
                        type="button"
                        className={`flex-1 rounded-md border border-secondary p-2 text-sm font-medium ${clientMode === "existing" ? "bg-secondary text-secondary-foreground" : ""}`}
                        onClick={() => form.setValue("clientMode", "existing")}
                    >
                        Existing client
                    </button>
                    <button
                        type="button"
                        className={`flex-1 rounded-md border border-secondary p-2 text-sm font-medium ${clientMode === "new" ? "bg-secondary text-secondary-foreground" : ""}`}
                        onClick={() => {
                            form.setValue("clientMode", "new");
                            onSelectClient(null);
                        }}
                    >
                        New client
                    </button>
                </div>

                {clientMode === "existing" ? (
                    selectedClient ? (
                        <ClientCard client={selectedClient} selected onClick={() => onSelectClient(null)} />
                    ) : (
                        <ClientSearch
                            selectedClientId={form.watch("existingClientId")}
                            onSelect={(client) => {
                                onSelectClient(client);
                                form.setValue("existingClientId", client.id, { shouldValidate: true });
                            }}
                            onCreateNew={() => form.setValue("clientMode", "new")}
                        />
                    )
                ) : (
                    <>
                        <Controller
                            control={form.control}
                            name="newClient.fullName"
                            render={({ field, fieldState }) => (
                                <Field invalid={fieldState.invalid}>
                                    <FieldLabel>Full name</FieldLabel>
                                    <Input {...field} placeholder="Client full name" />
                                    <FieldError>{fieldState.error?.message}</FieldError>
                                </Field>
                            )}
                        />
                        <Controller
                            control={form.control}
                            name="newClient.phone"
                            render={({ field, fieldState }) => (
                                <Field invalid={fieldState.invalid}>
                                    <FieldLabel>Phone</FieldLabel>
                                    <Input {...field} placeholder="+996 XXX XXX XXX" />
                                    <FieldError>{fieldState.error?.message}</FieldError>
                                </Field>
                            )}
                        />
                        <Controller
                            control={form.control}
                            name="newClient.whatsapp"
                            render={({ field, fieldState }) => (
                                <Field invalid={fieldState.invalid}>
                                    <FieldLabel>WhatsApp (optional)</FieldLabel>
                                    <Input {...field} />
                                    <FieldError>{fieldState.error?.message}</FieldError>
                                </Field>
                            )}
                        />
                        <Controller
                            control={form.control}
                            name="newClient.email"
                            render={({ field, fieldState }) => (
                                <Field invalid={fieldState.invalid}>
                                    <FieldLabel>Email (optional)</FieldLabel>
                                    <Input {...field} />
                                    <FieldError>{fieldState.error?.message}</FieldError>
                                </Field>
                            )}
                        />
                        <Controller
                            control={form.control}
                            name="newClient.passport"
                            render={({ field, fieldState }) => (
                                <Field invalid={fieldState.invalid}>
                                    <FieldLabel>Passport (optional)</FieldLabel>
                                    <Input {...field} />
                                    <FieldError>{fieldState.error?.message}</FieldError>
                                </Field>
                            )}
                        />
                        <Controller
                            control={form.control}
                            name="newClient.pin"
                            render={({ field, fieldState }) => (
                                <Field invalid={fieldState.invalid}>
                                    <FieldLabel>PIN (optional)</FieldLabel>
                                    <Input {...field} placeholder="14-digit PIN" />
                                    <FieldError>{fieldState.error?.message}</FieldError>
                                </Field>
                            )}
                        />
                    </>
                )}
            </FieldGroup>
        </SheetBody>
    );
}