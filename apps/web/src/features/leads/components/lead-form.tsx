import {useEffect, useMemo} from "react";
import {zodResolver} from "@hookform/resolvers/zod";
import {Loader2, TriangleAlert} from "lucide-react";
import {Controller, useForm} from "react-hook-form";
import {z} from "zod";
import {createListCollection} from "@ark-ui/react";

import {Alert, AlertTitle} from "@/components/ui/alert.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Field, FieldError, FieldGroup, FieldLabel} from "@/components/ui/field.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {SheetBody, SheetClose, SheetFooter} from "@/components/ui/sheet.tsx";
import {Textarea} from "@/components/ui/textarea.tsx";
import {useManagers} from "@/features/users/hooks/use-managers.ts";
import type {CreateLeadPayload, Lead, UpdateLeadPayload} from "@/features/leads/api/leads.api.ts";
import {LEAD_STATUS_LABEL_KEYS, LeadStatus} from "@/features/leads/types/lead.types.ts";
import {useTranslation} from "react-i18next";

const UNASSIGNED = "unassigned";

type LeadFormValues = {
    fullName: string;
    phone: string;
    email?: string;
    source?: string;
    status: LeadStatus;
    managerId: string;
    comment?: string;
};

type LeadFormProps = {
    lead?: Lead | null;
    errorMessage?: string;
    isSubmitting?: boolean;
    submitLabel?: string;
    onCancel?: () => void;
    onSubmit: (payload: CreateLeadPayload | UpdateLeadPayload) => void;
};

const DEFAULT_VALUES: LeadFormValues = {
    fullName: "",
    phone: "",
    email: "",
    source: "",
    status: LeadStatus.NEW,
    managerId: UNASSIGNED,
    comment: "",
};

function toFormValues(lead?: Lead | null): LeadFormValues {
    if (!lead) return DEFAULT_VALUES;
    return {
        fullName: lead.fullName,
        phone: lead.phone,
        email: lead.email ?? "",
        source: lead.source ?? "",
        status: lead.status,
        managerId: lead.manager?.id ?? UNASSIGNED,
        comment: lead.comment ?? "",
    };
}

export function LeadForm({
                              lead,
                              errorMessage,
                              isSubmitting = false,
                              submitLabel,
                              onCancel,
                              onSubmit,
                          }: LeadFormProps) {
    const { t } = useTranslation("leads");

    const managers = useManagers();

    // Rebuilt whenever the language changes, so a validation message that
    // fired before a language switch doesn't stay frozen in the old language.
    const leadSchema = useMemo(() => z.object({
        fullName: z.string().trim().min(2, t("form.validation.nameMin")),
        phone: z.string().trim().min(5, t("form.validation.phoneMin")),
        email: z.string().trim().email(t("form.validation.invalidEmail")).optional().or(z.literal("")),
        source: z.string().trim().optional(),
        status: z.enum(LeadStatus),
        managerId: z.string(),
        comment: z.string().trim().optional(),
    }), [t]);

    const form = useForm<LeadFormValues>({
        resolver: zodResolver(leadSchema),
        defaultValues: DEFAULT_VALUES,
    });

    useEffect(() => {
        form.reset(toFormValues(lead));
    }, [lead, form]);

    const statusCollection = createListCollection({
        items: Object.values(LeadStatus).map(
            (status) => ({
                label: t(LEAD_STATUS_LABEL_KEYS[status]),
                value: status
            })
        ),
    });

    const managerCollection = createListCollection({
        items: [
            { label: t("form.unassigned"), value: UNASSIGNED },
            ...managers.data.map((manager) => ({ label: manager.fullName, value: manager.id })),
        ],
    });

    const handleSubmit = (values: LeadFormValues) => {
        onSubmit({
            fullName: values.fullName.trim(),
            phone: values.phone.trim(),
            email: values.email?.trim() || undefined,
            source: values.source?.trim() || undefined,
            status: values.status,
            managerId: values.managerId === UNASSIGNED ? undefined : values.managerId,
            comment: values.comment?.trim() || undefined,
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
                        name="source"
                        render={({ field, fieldState }) => (
                            <Field invalid={fieldState.invalid}>
                                <FieldLabel>{t("form.source")}</FieldLabel>
                                <Input {...field} placeholder={t("form.sourcePlaceholder")} aria-label={t("form.source")} />
                                <FieldError>{fieldState.error?.message}</FieldError>
                            </Field>
                        )}
                    />

                    <Controller
                        control={form.control}
                        name="status"
                        render={({ field, fieldState }) => (
                            <Field invalid={fieldState.invalid}>
                                <FieldLabel>{t("form.status")}</FieldLabel>
                                <Select
                                    collection={statusCollection}
                                    value={[field.value]}
                                    onValueChange={(item) => field.onChange(item.value[0])}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {statusCollection.items.map((item) => (
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
                        name="managerId"
                        render={({ field, fieldState }) => (
                            <Field invalid={fieldState.invalid}>
                                <FieldLabel>{t("form.manager")}</FieldLabel>
                                <Select
                                    collection={managerCollection}
                                    value={[field.value]}
                                    onValueChange={(item) => field.onChange(item.value[0] ?? UNASSIGNED)}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
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
                        name="comment"
                        render={({ field, fieldState }) => (
                            <Field invalid={fieldState.invalid}>
                                <FieldLabel>{t("form.comment")}</FieldLabel>
                                <Textarea {...field} rows={3} placeholder={t("form.commentPlaceholder")} />
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
                            {t("form.cancel")}
                        </Button>
                    )}
                </SheetClose>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="animate-spin" />}
                    {submitLabel ?? (lead ? t("form.saveChanges") : t("form.create"))}
                </Button>
            </SheetFooter>
        </form>
    );
}
