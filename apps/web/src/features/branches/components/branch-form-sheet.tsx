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
    SheetTitle,
} from "@/components/ui/sheet.tsx";
import {FieldGroup} from "@/components/ui/field.tsx";
import type {CreateBranchPayload} from "../api/branches.api";
import type {Branch} from "../types/branch.types";

const EMPTY: CreateBranchPayload = {
    name: "",
    city: "",
    address: "",
    phone: "",
};

type Props = {
    open: boolean;
    /** null = create. A branch = edit. */
    branch: Branch | null;
    isSubmitting: boolean;
    onOpenChange(open: boolean): void;
    onSubmit(payload: CreateBranchPayload): void;
};

export function BranchFormSheet({open, branch, isSubmitting, onOpenChange, onSubmit}: Props) {
    const {t} = useTranslation("branches");
    const {t: tCommon} = useTranslation("common");
    const [form, setForm] = useState<CreateBranchPayload>(EMPTY);

    useEffect(() => {
        if (!open) return;

        setForm(
            branch
                ? {
                      name: branch.name,
                      city: branch.city ?? "",
                      address: branch.address ?? "",
                      phone: branch.phone ?? "",
                  }
                : EMPTY,
        );
    }, [open, branch]);

    const set = (key: keyof CreateBranchPayload) => (event: React.ChangeEvent<HTMLInputElement>) =>
        setForm((previous) => ({...previous, [key]: event.target.value}));

    const isEdit = branch !== null;

    return (
        <Sheet open={open} onOpenChange={({open: isOpen}) => onOpenChange(isOpen)}>
            <SheetContent className="sm:max-w-md" variant="inset">
                <SheetHeader>
                    <SheetTitle>{isEdit ? t("form.editTitle", {name: branch.name}) : t("form.newTitle")}</SheetTitle>
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
                            <Field label={t("form.fields.name")} required value={form.name} onChange={set("name")} />
                            <Field label={t("form.fields.city")} value={form.city ?? ""} onChange={set("city")} />
                            <Field
                                label={t("form.fields.address")}
                                value={form.address ?? ""}
                                onChange={set("address")}
                            />
                            <Field label={t("form.fields.phone")} value={form.phone ?? ""} onChange={set("phone")} />
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

type FieldProps = InputProps & {label: string};

function Field({label, ...props}: FieldProps) {
    return (
        <label className="block space-y-1.5">
            <span className="text-sm font-medium">{label}</span>
            <Input aria-label={label} {...props} />
        </label>
    );
}
