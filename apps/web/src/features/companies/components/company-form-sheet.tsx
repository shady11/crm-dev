import {useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {Button} from "@/components/ui/button.tsx";
import {Input, type InputProps} from "@/components/ui/input.tsx";
import {
    Sheet,
    SheetBody,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle
} from "@/components/ui/sheet.tsx";
import type {CreateCompanyPayload} from "../api/companies.api";
import type {Company} from "../types/company.types";
import {FieldGroup} from "@/components/ui/field.tsx";

const EMPTY: CreateCompanyPayload = {
    name: "",
    phone: "",
    address: "",
    currency: "KGS",
    locale: "ru-RU",
    timezone: "Asia/Bishkek",
    adminFullName: "",
    adminEmail: "",
    adminPassword: "",
};

type Props = {
    open: boolean;
    /** null = create. A company = edit; the admin fields are hidden then. */
    company: Company | null;
    isSubmitting: boolean;
    onOpenChange(open: boolean): void;
    onSubmit(payload: CreateCompanyPayload): void;
};

export function CompanyFormSheet({open, company, isSubmitting, onOpenChange, onSubmit}: Props) {
    const {t} = useTranslation("companies");
    const {t: tCommon} = useTranslation("common");
    const [form, setForm] = useState<CreateCompanyPayload>(EMPTY);

    useEffect(() => {
        if (!open) return;

        setForm(
            company
                ? {
                      ...EMPTY,
                      name: company.name,
                      phone: company.phone ?? "",
                      address: company.address ?? "",
                      currency: company.currency ?? "",
                      locale: company.locale ?? "",
                      timezone: company.timezone ?? "",
                  }
                : EMPTY,
        );
    }, [open, company]);

    const set = (key: keyof CreateCompanyPayload) => (event: React.ChangeEvent<HTMLInputElement>) =>
        setForm((previous) => ({...previous, [key]: event.target.value}));

    const isEdit = company !== null;

    return (
        <Sheet open={open} onOpenChange={({open: isOpen}) => onOpenChange(isOpen)}>
            <SheetContent className="sm:max-w-md" variant="inset">
                <SheetHeader>
                    <SheetTitle>
                        {isEdit ? t("form.editTitle", {name: company.name}) : t("form.newTitle")}
                    </SheetTitle>
                    <SheetDescription>
                        {isEdit ? t("form.editDescription") : t("form.newDescription")}
                    </SheetDescription>
                </SheetHeader>

                <form
                    className="flex min-h-0 flex-1 flex-col"
                    onSubmit={(event) => {
                        event.preventDefault();
                        onSubmit(form);
                    }}
                >
                    <SheetBody scrollFade>
                        <FieldGroup className="gap-5 py-4">
                            <Field
                                label={t("form.fields.name")}
                                required
                                value={form.name}
                                onChange={set("name")}
                            />
                            <Field label={t("form.fields.phone")} value={form.phone ?? ""} onChange={set("phone")} />
                            <Field
                                label={t("form.fields.address")}
                                value={form.address ?? ""}
                                onChange={set("address")}
                            />

                            <div className="grid grid-cols-3 gap-3">
                                <Field
                                    label={t("form.fields.currency")}
                                    value={form.currency ?? ""}
                                    onChange={set("currency")}
                                />
                                <Field
                                    label={t("form.fields.locale")}
                                    value={form.locale ?? ""}
                                    onChange={set("locale")}
                                />
                                <Field
                                    label={t("form.fields.timezone")}
                                    value={form.timezone ?? ""}
                                    onChange={set("timezone")}
                                />
                            </div>

                            {isEdit ? null : (
                                <div className="border-t pt-4">
                                    <p className="mb-3 text-sm font-medium">{t("form.adminSectionTitle")}</p>
                                    <div className="space-y-4">
                                        <Field
                                            label={t("form.fields.adminFullName")}
                                            required
                                            value={form.adminFullName}
                                            onChange={set("adminFullName")}
                                        />
                                        <Field
                                            label={t("form.fields.adminEmail")}
                                            type="email"
                                            required
                                            value={form.adminEmail}
                                            onChange={set("adminEmail")}
                                        />
                                        <Field
                                            label={t("form.fields.adminPassword")}
                                            type="password"
                                            value={form.adminPassword ?? ""}
                                            onChange={set("adminPassword")}
                                            hint={t("form.adminPasswordHint")}
                                        />
                                    </div>
                                </div>
                            )}
                        </FieldGroup>
                    </SheetBody>

                    <SheetFooter>
                        <Button type="submit" className="flex-1" disabled={isSubmitting}>
                            {isSubmitting
                                ? tCommon("actions.saving")
                                : isEdit
                                    ? tCommon("actions.saveChanges")
                                    : t("form.submit.create")}
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
}

type FieldProps = InputProps & {label: string; hint?: string};

function Field({label, hint, ...props}: FieldProps) {
    return (
        <label className="block space-y-1.5">
            <span className="text-sm font-medium">{label}</span>
            <Input aria-label={label} {...props} />
            {hint ? <span className="text-muted-foreground block text-xs">{hint}</span> : null}
        </label>
    );
}
