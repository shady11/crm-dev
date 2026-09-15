import {useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {Button} from "@/components/ui/button.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Textarea} from "@/components/ui/textarea.tsx";
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
import {PermissionPicker} from "./permission-picker";
import type {Permission, Role} from "../types/rbac.types";

export type RoleFormValues = {
    name: string;
    description: string;
    permissionKeys: string[];
};

type Props = {
    open: boolean;
    /** null = create a new custom role. A Role = editing an existing custom role. */
    role: Role | null;
    permissions: Permission[];
    isSubmitting: boolean;
    onOpenChange(open: boolean): void;
    onSubmit(values: RoleFormValues): void;
};

export function RoleFormSheet({open, role, permissions, isSubmitting, onOpenChange, onSubmit}: Props) {
    const {t} = useTranslation("rbac");
    const {t: tCommon} = useTranslation("common");
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [selected, setSelected] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!open) return;
        setName(role?.name ?? "");
        setDescription(role?.description ?? "");
        setSelected(new Set(role?.permissionKeys ?? []));
    }, [open, role]);

    const isEdit = role !== null;

    return (
        <Sheet open={open} onOpenChange={({open: isOpen}) => onOpenChange(isOpen)}>
            <SheetContent className="sm:max-w-lg" variant="inset">
                <SheetHeader>
                    <SheetTitle>{isEdit ? t("form.editTitle") : t("form.newTitle")}</SheetTitle>
                    <SheetDescription>{t("form.description")}</SheetDescription>
                </SheetHeader>

                <form
                    className="flex min-h-0 flex-1 flex-col"
                    onSubmit={(event) => {
                        event.preventDefault();
                        onSubmit({name, description, permissionKeys: Array.from(selected)});
                    }}
                >
                    <SheetBody scrollFade>
                        <FieldGroup className="gap-5 py-4">
                            <label className="block space-y-1.5">
                                <span className="text-sm font-medium">{t("form.fields.name")}</span>
                                <Input
                                    aria-label={t("form.fields.name")}
                                    required
                                    value={name}
                                    onChange={(event) => setName(event.target.value)}
                                />
                            </label>

                            <label className="block space-y-1.5">
                                <span className="text-sm font-medium">{t("form.fields.description")}</span>
                                <Textarea
                                    aria-label={t("form.fields.description")}
                                    value={description}
                                    onChange={(event) => setDescription(event.target.value)}
                                />
                            </label>

                            <div className="space-y-1.5">
                                <span className="text-sm font-medium">{t("form.fields.permissions")}</span>
                                <PermissionPicker permissions={permissions} selected={selected} onChange={setSelected} />
                            </div>
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
