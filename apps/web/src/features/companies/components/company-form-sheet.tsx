import {useEffect, useState} from "react";
import {Button} from "@/components/ui/button.tsx";
import {Input, type InputProps} from "@/components/ui/input.tsx";
import {Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle} from "@/components/ui/sheet.tsx";
import type {CreateCompanyPayload} from "../api/companies.api";
import type {Company} from "../types/company.types";

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
            <SheetContent className="w-full sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>{isEdit ? `Edit ${company.name}` : "New company"}</SheetTitle>
                    <SheetDescription>
                        {isEdit
                            ? "Company settings. Currency and locale drive how money and dates appear for everyone in this tenant."
                            : "The first administrator is created with the company — a tenant with no way in cannot create one for itself."}
                    </SheetDescription>
                </SheetHeader>

                <form
                    className="space-y-4 overflow-y-auto px-4 pb-6"
                    onSubmit={(event) => {
                        event.preventDefault();
                        onSubmit(form);
                    }}
                >
                    <Field label="Company name" required value={form.name} onChange={set("name")} />
                    <Field label="Phone" value={form.phone ?? ""} onChange={set("phone")} />
                    <Field label="Address" value={form.address ?? ""} onChange={set("address")} />

                    <div className="grid grid-cols-3 gap-3">
                        <Field label="Currency" value={form.currency ?? ""} onChange={set("currency")} />
                        <Field label="Locale" value={form.locale ?? ""} onChange={set("locale")} />
                        <Field label="Timezone" value={form.timezone ?? ""} onChange={set("timezone")} />
                    </div>

                    {isEdit ? null : (
                        <div className="border-t pt-4">
                            <p className="mb-3 text-sm font-medium">First administrator</p>
                            <div className="space-y-4">
                                <Field
                                    label="Full name"
                                    required
                                    value={form.adminFullName}
                                    onChange={set("adminFullName")}
                                />
                                <Field
                                    label="Email"
                                    type="email"
                                    required
                                    value={form.adminEmail}
                                    onChange={set("adminEmail")}
                                />
                                <Field
                                    label="Password"
                                    type="password"
                                    value={form.adminPassword ?? ""}
                                    onChange={set("adminPassword")}
                                    hint="Leave blank to generate one. It is shown once."
                                />
                            </div>
                        </div>
                    )}

                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? "Saving..." : isEdit ? "Save changes" : "Create company"}
                    </Button>
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
