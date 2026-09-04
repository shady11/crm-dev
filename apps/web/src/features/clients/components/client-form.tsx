import {useEffect, useMemo} from "react";
import {zodResolver} from "@hookform/resolvers/zod";
import {Loader2, TriangleAlert} from "lucide-react";
import {Controller, useForm} from "react-hook-form";
import {z} from "zod";
import {useTranslation} from "react-i18next";

import {Button} from "@/components/ui/button.tsx";
import {Field, FieldError, FieldGroup, FieldLabel} from "@/components/ui/field.tsx";
import {Input} from "@/components/ui/input.tsx";
import {SheetBody, SheetClose, SheetFooter} from "@/components/ui/sheet.tsx";
import {Alert, AlertTitle} from "@/components/ui/alert.tsx";
import type {CreateClientPayload, UpdateClientPayload} from "@/features/clients/api/clients.api.ts";
import type {Client} from "@/features/clients/types/client.types";

type ClientFormValues = {
    fullName: string;
    phone: string;
    whatsapp?: string;
    email?: string;
    passport?: string;
    pin?: string;
};

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
    const { t } = useTranslation("clients");

    // Rebuilt whenever the language changes, so a validation message that
    // fired before a language switch doesn't stay frozen in the old language.
    const clientSchema = useMemo(() => z.object({
        fullName: z.string().trim().min(2, t("form.validation.nameMin")),
        phone: z.string().trim().min(5, t("form.validation.phoneMin")),
        whatsapp: z.string().trim().optional(),
        email: z.string().trim().email(t("form.validation.invalidEmail")).optional().or(z.literal("")),
        passport: z.string().trim().optional(),
        pin: z.string().trim().optional(),
    }), [t]);

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
                                <FieldLabel>{t("form.fullName")}</FieldLabel>
                                <Input {...field} placeholder={t("form.fullName")} aria-label={t("form.fullName")} />
                                <FieldError>{fieldState.error?.message}</FieldError>
                            </Field>
                        )}
                    />

                    <Controller
                        control={form.control}
                        name="phone"
                        render={({ field, fieldState }) => (
                            <Field invalid={fieldState.invalid}>
                                <FieldLabel>{t("form.phone")}</FieldLabel>
                                <Input {...field} placeholder={t("form.phone")} aria-label={t("form.phone")} />
                                <FieldError>{fieldState.error?.message}</FieldError>
                            </Field>
                        )}
                    />

                    <Controller
                        control={form.control}
                        name="whatsapp"
                        render={({ field, fieldState }) => (
                            <Field invalid={fieldState.invalid}>
                                <FieldLabel>{t("form.whatsapp")}</FieldLabel>
                                <Input {...field} placeholder={t("form.whatsappPlaceholder")} aria-label={t("form.whatsapp")} />
                                <FieldError>{fieldState.error?.message}</FieldError>
                            </Field>
                        )}
                    />

                    <Controller
                        control={form.control}
                        name="email"
                        render={({ field, fieldState }) => (
                            <Field invalid={fieldState.invalid}>
                                <FieldLabel>{t("form.email")}</FieldLabel>
                                <Input {...field} type="email" placeholder="name@example.com" aria-label={t("form.email")} />
                                <FieldError>{fieldState.error?.message}</FieldError>
                            </Field>
                        )}
                    />

                    <Controller
                        control={form.control}
                        name="passport"
                        render={({ field, fieldState }) => (
                            <Field invalid={fieldState.invalid}>
                                <FieldLabel>{t("form.passport")}</FieldLabel>
                                <Input {...field} placeholder={t("form.passportPlaceholder")} aria-label={t("form.passport")} />
                                <FieldError>{fieldState.error?.message}</FieldError>
                            </Field>
                        )}
                    />

                    <Controller
                        control={form.control}
                        name="pin"
                        render={({ field, fieldState }) => (
                            <Field invalid={fieldState.invalid}>
                                <FieldLabel>{t("form.pin")}</FieldLabel>
                                <Input {...field} placeholder={t("form.pinPlaceholder")} aria-label={t("form.pin")} />
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
                            {t("actions.cancel", { ns: "common" })}
                        </Button>
                    )}
                </SheetClose>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="animate-spin" />}
                    {submitLabel ?? (client ? t("form.saveChanges") : t("form.create"))}
                </Button>
            </SheetFooter>
        </form>
    );
}
