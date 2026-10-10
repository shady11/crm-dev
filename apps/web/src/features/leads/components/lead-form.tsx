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
import {DateField} from "@/components/shared/date-field.tsx";
import {useManagers} from "@/features/users/hooks/use-managers.ts";
import {useAuth} from "@/features/auth/hooks/use-auth.ts";
import {hasPermission} from "@/features/auth/access.ts";
import {isoToDay, nextContactToIso} from "@/features/leads/utils/format.ts";
import type {CreateLeadPayload, Lead, UpdateLeadPayload} from "@/features/leads/api/leads.api.ts";
import {LEAD_STATUS_LABEL_KEYS, LeadStatus} from "@/features/leads/types/lead.types.ts";
import {LEAD_SOURCES} from "@/features/leads/utils/sources.ts";
import {useProjectsFilter} from "@/features/projects/hooks/use-projects-filter.ts";
import {FINANCING_TYPE_LABEL_KEYS} from "@/features/deals/types/deal.types.ts";
import type {FinancingType} from "@/features/deals/api/deals.api.ts";
import {useTranslation} from "react-i18next";

const UNASSIGNED = "unassigned";
// Select can't hold an empty value, so "nothing picked" gets its own token.
const NONE = "none";
const FINANCING_TYPES: FinancingType[] = ["CASH", "INSTALLMENT", "MORTGAGE"];

type LeadFormValues = {
    fullName: string;
    phone: string;
    email?: string;
    source: string;
    status: LeadStatus;
    managerId: string;
    nextContactDay: string;
    budget: string;
    rooms: string;
    preferredProjectId: string;
    financingType: string;
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
    source: NONE,
    status: LeadStatus.NEW,
    managerId: UNASSIGNED,
    nextContactDay: "",
    budget: "",
    rooms: "",
    preferredProjectId: NONE,
    financingType: NONE,
    comment: "",
};

function toFormValues(lead?: Lead | null): LeadFormValues {
    if (!lead) return DEFAULT_VALUES;
    return {
        fullName: lead.fullName,
        phone: lead.phone,
        email: lead.email ?? "",
        source: lead.source || NONE,
        status: lead.status,
        managerId: lead.manager?.id ?? UNASSIGNED,
        nextContactDay: isoToDay(lead.nextContactAt),
        budget: lead.budget != null ? String(Number(lead.budget)) : "",
        rooms: lead.rooms != null ? String(lead.rooms) : "",
        preferredProjectId: lead.preferredProject?.id ?? NONE,
        financingType: lead.financingType ?? NONE,
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
    const projects = useProjectsFilter();
    const { user } = useAuth();
    // Without leads.assign the API puts a new lead in the creator's own name
    // and refuses anyone else's, so there is nothing to pick.
    const canAssign = hasPermission(user, "leads.assign");

    // Rebuilt whenever the language changes, so a validation message that
    // fired before a language switch doesn't stay frozen in the old language.
    const leadSchema = useMemo(() => z.object({
        fullName: z.string().trim().min(2, t("form.validation.nameMin")),
        phone: z.string().trim().min(5, t("form.validation.phoneMin")),
        email: z.string().trim().email(t("form.validation.invalidEmail")).optional().or(z.literal("")),
        source: z.string(),
        status: z.enum(LeadStatus),
        managerId: z.string(),
        nextContactDay: z.string(),
        budget: z.string().trim().refine((v) => v === "" || (Number(v) >= 0 && Number.isFinite(Number(v))), t("form.validation.budget")),
        rooms: z.string().trim().refine((v) => v === "" || (Number.isInteger(Number(v)) && Number(v) >= 0 && Number(v) <= 10), t("form.validation.rooms")),
        preferredProjectId: z.string(),
        financingType: z.string(),
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

    // A source typed before the fixed list existed stays selectable as is.
    const currentSource = lead?.source;
    const sourceCollection = createListCollection({
        items: [
            { label: t("form.notSpecified"), value: NONE },
            ...LEAD_SOURCES.map((source) => ({ label: t(`sources.${source}`), value: source as string })),
            ...(currentSource && !(LEAD_SOURCES as readonly string[]).includes(currentSource)
                ? [{ label: currentSource, value: currentSource }]
                : []),
        ],
    });

    const projectCollection = createListCollection({
        items: [
            { label: t("form.anyProject"), value: NONE },
            ...projects.data.map((project) => ({ label: project.name, value: project.id })),
            // Keeps a project the list doesn't return (archived, past the first page) visible.
            ...(lead?.preferredProject && !projects.data.some((p) => p.id === lead.preferredProject?.id)
                ? [{ label: lead.preferredProject.name, value: lead.preferredProject.id }]
                : []),
        ],
    });

    const financingCollection = createListCollection({
        items: [
            { label: t("form.notSpecified"), value: NONE },
            ...FINANCING_TYPES.map((type) => ({ label: t(FINANCING_TYPE_LABEL_KEYS[type]), value: type as string })),
        ],
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
            source: values.source !== NONE ? values.source : undefined,
            status: values.status,
            managerId: !canAssign || values.managerId === UNASSIGNED ? undefined : values.managerId,
            // On edit an emptied field clears the date; on create it is just left out.
            nextContactAt: values.nextContactDay
                ? nextContactToIso(values.nextContactDay)
                : lead ? null : undefined,
            comment: values.comment?.trim() || undefined,
            // On edit an emptied field is sent as null to clear it.
            budget: values.budget.trim() ? Number(values.budget) : lead ? null : undefined,
            rooms: values.rooms.trim() ? Number(values.rooms) : lead ? null : undefined,
            preferredProjectId: values.preferredProjectId !== NONE ? values.preferredProjectId : lead ? null : undefined,
            financingType: values.financingType !== NONE ? (values.financingType as FinancingType) : lead ? null : undefined,
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
                        render={({ field }) => (
                            <Field>
                                <FieldLabel>{t("form.source")}</FieldLabel>
                                <Select
                                    collection={sourceCollection}
                                    value={[field.value]}
                                    onValueChange={(item) => field.onChange(item.value[0] ?? NONE)}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sourceCollection.items.map((item) => (
                                            <SelectItem key={item.value} item={item}>
                                                {item.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
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

                    <fieldset className="flex flex-col gap-4 rounded-lg border border-secondary p-4">
                        <legend className="px-1 text-sm font-medium">{t("form.lookingFor")}</legend>
                        <div className="grid grid-cols-2 gap-3">
                            <Controller
                                control={form.control}
                                name="rooms"
                                render={({ field, fieldState }) => (
                                    <Field invalid={fieldState.invalid}>
                                        <FieldLabel>{t("form.rooms")}</FieldLabel>
                                        <Input {...field} type="number" inputMode="numeric" min={0} max={10} step={1} placeholder="2" />
                                        <FieldError>{fieldState.error?.message}</FieldError>
                                    </Field>
                                )}
                            />
                            <Controller
                                control={form.control}
                                name="budget"
                                render={({ field, fieldState }) => (
                                    <Field invalid={fieldState.invalid}>
                                        <FieldLabel>{t("form.budget")}</FieldLabel>
                                        <Input {...field} type="number" inputMode="decimal" min={0} step="any" placeholder="50000" />
                                        <FieldError>{fieldState.error?.message}</FieldError>
                                    </Field>
                                )}
                            />
                        </div>
                        <Controller
                            control={form.control}
                            name="preferredProjectId"
                            render={({ field }) => (
                                <Field>
                                    <FieldLabel>{t("form.preferredProject")}</FieldLabel>
                                    <Select
                                        collection={projectCollection}
                                        value={[field.value]}
                                        onValueChange={(item) => field.onChange(item.value[0] ?? NONE)}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {projectCollection.items.map((item) => (
                                                <SelectItem key={item.value} item={item}>
                                                    {item.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Field>
                            )}
                        />
                        <Controller
                            control={form.control}
                            name="financingType"
                            render={({ field }) => (
                                <Field>
                                    <FieldLabel>{t("form.financingType")}</FieldLabel>
                                    <Select
                                        collection={financingCollection}
                                        value={[field.value]}
                                        onValueChange={(item) => field.onChange(item.value[0] ?? NONE)}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {financingCollection.items.map((item) => (
                                                <SelectItem key={item.value} item={item}>
                                                    {item.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Field>
                            )}
                        />
                    </fieldset>

                    <Controller
                        control={form.control}
                        name="nextContactDay"
                        render={({ field }) => (
                            <Field>
                                <FieldLabel>{t("form.nextContact")}</FieldLabel>
                                <DateField value={field.value} onChange={field.onChange} clearable />
                            </Field>
                        )}
                    />

                    {canAssign && (
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
                    )}

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
