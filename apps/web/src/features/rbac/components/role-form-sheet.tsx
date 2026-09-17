import {useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {Button} from "@/components/ui/button.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Textarea} from "@/components/ui/textarea.tsx";
import {
    Dialog,
    DialogBody,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog.tsx";
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
    // A system role's name and permissions are fixed (see RbacService) — the
    // dialog still opens for one, but read-only, so its permission set stays
    // inspectable without implying it can be changed here.
    const readOnly = role?.isSystem ?? false;

    return (
        <Dialog open={open} onOpenChange={({open: isOpen}) => onOpenChange(isOpen)}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>{readOnly ? (role?.name ?? "") : isEdit ? t("form.editTitle") : t("form.newTitle")}</DialogTitle>
                    <DialogDescription>
                        {readOnly ? t("form.readOnlyDescription") : t("form.description")}
                    </DialogDescription>
                </DialogHeader>

                <form
                    className="flex min-h-0 flex-1 flex-col"
                    onSubmit={(event) => {
                        event.preventDefault();
                        onSubmit({name, description, permissionKeys: Array.from(selected)});
                    }}
                >
                    <DialogBody className="space-y-5">
                        {!readOnly && (
                            <FieldGroup className="gap-4">
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
                            </FieldGroup>
                        )}

                        <div className="space-y-2">
                            <span className="text-sm font-semibold">{t("form.fields.permissions")}</span>
                            <PermissionPicker
                                permissions={permissions}
                                selected={selected}
                                onChange={setSelected}
                                disabled={readOnly}
                            />
                        </div>
                    </DialogBody>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                            {readOnly ? tCommon("actions.close") : tCommon("actions.cancel")}
                        </Button>
                        {!readOnly && (
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting
                                    ? tCommon("actions.saving")
                                    : isEdit
                                      ? tCommon("actions.saveChanges")
                                      : t("form.submit.create")}
                            </Button>
                        )}
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
