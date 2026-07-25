import {useEffect} from "react";
import {zodResolver} from "@hookform/resolvers/zod";
import {Loader2, TriangleAlert} from "lucide-react";
import {Controller, useForm} from "react-hook-form";
import {z} from "zod";

import {Button} from "@/components/ui/button.tsx";
import {Field, FieldError, FieldGroup, FieldLabel} from "@/components/ui/field.tsx";
import {Input} from "@/components/ui/input.tsx";
import {SheetBody, SheetClose, SheetFooter} from "@/components/ui/sheet.tsx";
import {Alert, AlertTitle} from "@/components/ui/alert.tsx";
import type {CreateClientPayload, UpdateClientPayload} from "@/features/clients/api/clients.api.ts";
import type {Client} from "@/features/clients/types/client.types";

const clientSchema = z.object({
    fullName: z.string().trim().min(2, "Name must be at least 2 characters"),
    phone: z.string().trim().min(5, "Phone must be at least 5 characters"),
    whatsapp: z.string().trim().optional(),
    email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
    passport: z.string().trim().optional(),
    pin: z.string().trim().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

type ClientFormProps = {
    client?: Client | null;
    errorMessage?: string;
    isSubmitting?: boolean;
    submitLabel?: string;
    onCancel?: () => void;
    onSubmit: (payload: CreateClientPayload | UpdateClientPayload) => void;
};

const DEFAULT_VALUES: ClientFormValues = {
    fullName: "",
    phone: "",
    whatsapp: "",
    email: "",
    passport: "",
    pin: "",
};

export function ClientForm({
                               client,
                               errorMessage,
                               isSubmitting = false,
                               submitLabel,
                               onCancel,
                               onSubmit,
                           }: ClientFormProps) {
    const form = useForm<ClientFormValues>({
        resolver: zodResolver(clientSchema),
        defaultValues: DEFAULT_VALUES,
    });

    useEffect(() => {
        form.reset({
            fullName: client?.fullName ?? "",
            phone: client?.phone ?? "",
            whatsapp: client?.whatsapp ?? "",
            email: client?.email ?? "",
            passport: client?.passport ?? "",
            pin: client?.pin ?? "",
        });
    }, [client, form]);

    const handleSubmit = (values: ClientFormValues) => {
        onSubmit({
            fullName: values.fullName.trim(),
            phone: values.phone.trim(),
            whatsapp: values.whatsapp?.trim() || undefined,
            email: values.email?.trim() || undefined,
            passport: values.passport?.trim() || undefined,
            pin: values.pin?.trim() || undefined,
        });
    };

    return (
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={form.handleSubmit(handleSubmit)}>
            <SheetBody scrollFade>
                <FieldGroup className="gap-5 py-4">
                    <Controller
                        control={form.control}
                        name="fullName"
                        render={({ field, fieldState }) => (
                            <Field invalid={fieldState.invalid}>
                                <FieldLabel>Full name</FieldLabel>
                                <Input {...field} placeholder="Full name" aria-label="Full name" />
                                <FieldError>{fieldState.error?.message}</FieldError>
                            </Field>
                        )}
                    />

                    <Controller
                        control={form.control}
                        name="phone"
                        render={({ field, fieldState }) => (
                            <Field invalid={fieldState.invalid}>
                                <FieldLabel>Phone</FieldLabel>
                                <Input {...field} placeholder="Phone" aria-label="Phone" />
                                <FieldError>{fieldState.error?.message}</FieldError>
                            </Field>
                        )}
                    />

                    <Controller
                        control={form.control}
                        name="whatsapp"
                        render={({ field, fieldState }) => (
                            <Field invalid={fieldState.invalid}>
                                <FieldLabel>WhatsApp (optional)</FieldLabel>
                                <Input {...field} placeholder="WhatsApp" aria-label="WhatsApp" />
                                <FieldError>{fieldState.error?.message}</FieldError>
                            </Field>
                        )}
                    />

                    <Controller
                        control={form.control}
                        name="email"
                        render={({ field, fieldState }) => (
                            <Field invalid={fieldState.invalid}>
                                <FieldLabel>Email (optional)</FieldLabel>
                                <Input {...field} type="email" placeholder="name@example.com" aria-label="Email" />
                                <FieldError>{fieldState.error?.message}</FieldError>
                            </Field>
                        )}
                    />

                    <Controller
                        control={form.control}
                        name="passport"
                        render={({ field, fieldState }) => (
                            <Field invalid={fieldState.invalid}>
                                <FieldLabel>Passport (optional)</FieldLabel>
                                <Input {...field} placeholder="Passport number" aria-label="Passport" />
                                <FieldError>{fieldState.error?.message}</FieldError>
                            </Field>
                        )}
                    />

                    <Controller
                        control={form.control}
                        name="pin"
                        render={({ field, fieldState }) => (
                            <Field invalid={fieldState.invalid}>
                                <FieldLabel>PIN (optional)</FieldLabel>
                                <Input {...field} placeholder="PIN" aria-label="PIN" />
                                <FieldError>{fieldState.error?.message}</FieldError>
                            </Field>
                        )}
                    />
                </FieldGroup>

                {errorMessage && (
                    <Alert variant="destructive" className="mt-4">
                        <TriangleAlert />
                        <AlertTitle>{errorMessage}</AlertTitle>
                    </Alert>
                )}
            </SheetBody>
            <SheetFooter>
                <SheetClose asChild>
                    {onCancel && (
                        <Button variant="secondary" className="flex-1" disabled={isSubmitting} onClick={onCancel}>
                            Cancel
                        </Button>
                    )}
                </SheetClose>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="animate-spin" />}
                    {submitLabel ?? (client ? "Save changes" : "Create client")}
                </Button>
            </SheetFooter>
        </form>
    );
}