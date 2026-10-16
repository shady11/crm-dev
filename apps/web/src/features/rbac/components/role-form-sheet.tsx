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
import {Switch} from "@/components/ui/switch.tsx";
import {PermissionPicker} from "./permission-picker";
import type {Permission, Role} from "../types/rbac.types";
import {useAuth} from "@/features/auth/hooks/use-auth.ts";

export type RoleFormValues = {
    name: string;
    description: string;
    permissionKeys: string[];
    /** Own discretionary discount ceiling, in percent. null = unlimited. */
    discountLimit: number | null;
    /** CA-3: limited to the holder's own branch. */
    isBranchScoped: boolean;
};

type Props = {
    open: boolean;
    /** null = create a new custom role. A Role = editing an existing custom role. */
    role: Role | null;
    permissions: Permission[];
    isSubmitting: boolean;
    onOpenChange(open: boolean): void;
    onSubmit(values: RoleFormValues): void;
    /** CA-2: shown on a role the viewer can't edit, to make an editable copy. */
    onCopy?(role: Role): void;
    isCopying?: boolean;
};

export function RoleFormSheet({open, role, permissions, isSubmitting, onOpenChange, onSubmit, onCopy, isCopying}: Props) {
    const {t} = useTranslation("rbac");
    const {t: tCommon} = useTranslation("common");
    const {user} = useAuth();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [discountLimit, setDiscountLimit] = useState("");
    const [isBranchScoped, setIsBranchScoped] = useState(false);

    useEffect(() => {
        if (!open) return;
        setName(role?.name ?? "");
        setDescription(role?.description ?? "");
        setSelected(new Set(role?.permissionKeys ?? []));
        setDiscountLimit(role?.discountLimit === null || role?.discountLimit === undefined ? "" : String(role.discountLimit));
        setIsBranchScoped(role?.isBranchScoped ?? false);
    }, [open, role]);

    // The API refuses to change the scope while anyone holds the role.
    const scopeLocked = role !== null && role.userCount > 0;

    const isEdit = role !== null;
    // A global role (companyId null — every built-in role, plus any a
    // platform administrator has added) can only be managed by a platform
    // administrator; a tenant's own custom role by that tenant. The dialog
    // still opens for a role the viewer can't edit, but read-only, so its
    // permission set stays inspectable without implying it can be changed
    // here. See RbacService.assertCanManageRole.
    const readOnly = role !== null && role.companyId === null && !user?.isSuperAdmin;

    return (
        <Dialog open={open} onOpenChange={({open: isOpen}) => onOpenChange(isOpen)}>
            <DialogContent className="sm:max-w-3xl">
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
                        onSubmit({
                            name,
                            description,
                            permissionKeys: Array.from(selected),
                            discountLimit: discountLimit.trim() === "" ? null : Number(discountLimit),
                            isBranchScoped,
                        });
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

                                <label className="block space-y-1.5">
                                    <span className="text-sm font-medium">{t("form.fields.discountLimit")}</span>
                                    <Input
                                        aria-label={t("form.fields.discountLimit")}
                                        type="number"
                                        min={0}
                                        max={100}
                                        step={0.01}
                                        placeholder={t("form.placeholders.discountLimitUnlimited")}
                                        value={discountLimit}
                                        onChange={(event) => setDiscountLimit(event.target.value)}
                                    />
                                    <span className="text-muted-foreground text-xs">
                                        {t("form.hints.discountLimit")}
                                    </span>
                                </label>

                                <div className="flex items-start gap-3">
                                    <Switch
                                        className="mt-0.5"
                                        checked={isBranchScoped}
                                        disabled={scopeLocked}
                                        onCheckedChange={({checked}) => setIsBranchScoped(checked)}
                                        aria-label={t("form.fields.branchScoped")}
                                    />
                                    <div className="space-y-0.5">
                                        <span className="text-sm font-medium">{t("form.fields.branchScoped")}</span>
                                        <p className="text-muted-foreground text-xs">
                                            {scopeLocked ? t("form.hints.branchScopedLocked") : t("form.hints.branchScoped")}
                                        </p>
                                    </div>
                                </div>
                            </FieldGroup>
                        )}

                        {readOnly && (
                            <div className="text-muted-foreground space-y-1 text-sm">
                                <p>
                                    {role?.discountLimit === null
                                        ? t("form.hints.discountLimitReadOnlyUnlimited")
                                        : t("form.hints.discountLimitReadOnly", {limit: role?.discountLimit})}
                                </p>
                                <p>{role?.isBranchScoped ? t("form.hints.branchScopedReadOnly") : t("form.hints.companyWideReadOnly")}</p>
                            </div>
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
                        {readOnly && role && onCopy && (
                            <Button type="button" disabled={isCopying} isLoading={isCopying} onClick={() => onCopy(role)}>
                                {t("form.copy")}
                            </Button>
                        )}
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
