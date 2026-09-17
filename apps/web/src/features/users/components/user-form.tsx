import {useEffect, useMemo, useState} from "react";
import {zodResolver} from "@hookform/resolvers/zod";
import {Loader2, TriangleAlert} from "lucide-react";
import {Controller, useForm} from "react-hook-form";
import {useQuery} from "@tanstack/react-query";
import {z} from "zod";

import {Button} from "@/components/ui/button.tsx";
import {Field, FieldError, FieldGroup, FieldLabel} from "@/components/ui/field.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {SheetBody, SheetClose, SheetFooter} from "@/components/ui/sheet.tsx";
import {createListCollection} from "@ark-ui/react";
import {Alert, AlertTitle} from "@/components/ui/alert.tsx";
import type {CreateUserPayload, UpdateUserPayload} from "@/features/users/api/users.api";
import type {User} from "@/features/users/types/user.types";
import {getRoles} from "@/features/rbac/api/rbac.api";
import {useBranchesFilter} from "@/features/branches/hooks/use-branches-filter";
import {useTranslation} from "react-i18next";

// The Super Admin system role belongs to no company and is never
// assignable from the Users page.
const SUPER_ADMIN_ROLE_NAME = "Super Admin";

// The schemas below are built inside the component (see useMemo further
// down), not here at module scope, so their validation messages re-render
// in the active language rather than freezing in whatever language was
// active when the module first loaded.
const baseSchemaShape = (t: (key: string) => string) => ({
    fullName: z.string().trim().min(2, t("form.validation.nameMin")),
    email: z.string().trim().email(t("form.validation.invalidEmail")),
    phone: z.string().trim().optional(),
    roleId: z.string().min(1, t("form.validation.roleRequired")),
    branchId: z.string().optional(),
});

// Branch-scoped role ⇒ branchId required; company-wide role ⇒ branchId must
// be absent. Applied as a superRefine (not a plain per-field rule) since the
// requirement depends on the selected role's isBranchScoped flag, looked up
// from the roles list rather than encoded on the value itself.
function withBranchRule<Schema extends z.ZodType<{roleId: string; branchId?: string}>>(
    schema: Schema,
    t: (key: string) => string,
    branchScopedRoleIds: Set<string>,
) {
    return schema.superRefine((values, ctx) => {
        const isBranchScoped = branchScopedRoleIds.has(values.roleId);
        if (isBranchScoped && !values.branchId) {
            ctx.addIssue({
                code: "custom",
                path: ["branchId"],
                message: t("form.validation.branchRequired"),
            });
        }
        if (!isBranchScoped && values.branchId) {
            ctx.addIssue({
                code: "custom",
                path: ["branchId"],
                message: t("form.validation.branchNotAllowed"),
            });
        }
    });
}

type UserFormValues = {
    fullName: string;
    email: string;
    phone?: string;
    roleId: string;
    branchId?: string;
    password?: string;
};

type UserFormProps = {
    user?: User | null;
    errorMessage?: string;
    isSubmitting?: boolean;
    submitLabel?: string;
    onCancel?: () => void;
    onSubmit: (payload: CreateUserPayload | UpdateUserPayload) => void;
};

const DEFAULT_VALUES: UserFormValues = {
    fullName: "",
    email: "",
    phone: "",
    password: "",
    roleId: "",
    branchId: undefined,
};

export function UserForm({
                             user,
                             errorMessage,
                             isSubmitting = false,
                             submitLabel,
                             onCancel,
                             onSubmit,
                         }: UserFormProps) {
    const { t } = useTranslation("users");
    const { t: tCommon } = useTranslation("common");

    const rolesQuery = useQuery({ queryKey: ["rbac", "roles"], queryFn: getRoles });
    const roles = useMemo(
        () => (rolesQuery.data ?? []).filter((role) => role.name !== SUPER_ADMIN_ROLE_NAME),
        [rolesQuery.data],
    );
    const branchScopedRoleIds = useMemo(
        () => new Set(roles.filter((role) => role.isBranchScoped).map((role) => role.id)),
        [roles],
    );
    const branches = useBranchesFilter();

    const initialRoleId = user?.roleId ?? "";
    const [selectedRoleId, setSelectedRoleId] = useState<string>(initialRoleId);

    const createUserSchema = useMemo(() => {
        const base = baseSchemaShape(t);
        return withBranchRule(
            z.object({
                ...base,
                password: z.string().min(6, t("form.validation.passwordMin")),
            }),
            t,
            branchScopedRoleIds,
        );
    }, [t, branchScopedRoleIds]);

    const editUserSchema = useMemo(() => {
        const base = baseSchemaShape(t);
        return withBranchRule(
            z.object({
                ...base,
                password: z
                    .string()
                    .min(6, t("form.validation.passwordMin"))
                    .optional()
                    .or(z.literal("")),
            }),
            t,
            branchScopedRoleIds,
        );
    }, [t, branchScopedRoleIds]);

    const form = useForm<UserFormValues>({
        resolver: zodResolver(user ? editUserSchema : createUserSchema),
        defaultValues: { ...DEFAULT_VALUES, roleId: initialRoleId, branchId: user?.branchId ?? undefined },
    });

    useEffect(() => {
        setSelectedRoleId(initialRoleId);
        form.reset({
            fullName: user?.fullName ?? "",
            email: user?.email ?? "",
            phone: user?.phone ?? "",
            password: "",
            roleId: initialRoleId,
            branchId: user?.branchId ?? undefined,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form, initialRoleId, user]);

    const isSelectedRoleBranchScoped = branchScopedRoleIds.has(selectedRoleId);

    const handleSubmit = (values: UserFormValues) => {
        const branchId = branchScopedRoleIds.has(values.roleId) ? values.branchId : undefined;

        if (user) {
            const payload: UpdateUserPayload = {
                fullName: values.fullName.trim(),
                email: values.email.trim(),
                phone: values.phone?.trim() || undefined,
                roleId: values.roleId,
                branchId,
            };
            onSubmit(payload);
            return;
        }

        onSubmit({
            fullName: values.fullName.trim(),
            email: values.email.trim(),
            phone: values.phone?.trim() || undefined,
            password: values.password!,
            roleId: values.roleId,
            branchId,
        });
    };

    const roleCollection = createListCollection({
        items: roles.map((role) => ({
            label: role.name,
            value: role.id,
        })),
    });

    const branchCollection = createListCollection({
        items: branches.data.map((branch) => ({ label: branch.name, value: branch.id })),
    });

    return (
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={form.handleSubmit(handleSubmit)}>
            <SheetBody scrollFade>
                <FieldGroup className="gap-5 py-4">
                    <Controller
                        control={form.control}
                        name="fullName"
                        render={({ field, fieldState }) => (
                            <Field invalid={fieldState.invalid}>
                                <FieldLabel>{t("form.fields.fullName")}</FieldLabel>
                                <Input
                                    {...field}
                                    placeholder={t("form.placeholders.fullName")}
                                    aria-label={t("form.fields.fullName")}
                                />
                                <FieldError>{fieldState.error?.message}</FieldError>
                            </Field>
                        )}
                    />

                    <Controller
                        control={form.control}
                        name="email"
                        render={({ field, fieldState }) => (
                            <Field invalid={fieldState.invalid}>
                                <FieldLabel>{t("form.fields.email")}</FieldLabel>
                                <Input
                                    {...field}
                                    type="email"
                                    placeholder={t("form.placeholders.email")}
                                    aria-label={t("form.fields.email")}
                                />
                                <FieldError>{fieldState.error?.message}</FieldError>
                            </Field>
                        )}
                    />

                    <Controller
                        control={form.control}
                        name="phone"
                        render={({ field, fieldState }) => (
                            <Field invalid={fieldState.invalid}>
                                <FieldLabel>{t("form.fields.phone")}</FieldLabel>
                                <Input
                                    {...field}
                                    placeholder={t("form.placeholders.phone")}
                                    aria-label={t("form.fields.phone")}
                                />
                                <FieldError>{fieldState.error?.message}</FieldError>
                            </Field>
                        )}
                    />

                    <Controller
                        control={form.control}
                        name="password"
                        render={({ field, fieldState }) => (
                            <Field invalid={fieldState.invalid}>
                                <FieldLabel>
                                    {user ? t("form.fields.newPassword") : t("form.fields.password")}
                                </FieldLabel>
                                <Input
                                    {...field}
                                    type="password"
                                    placeholder={
                                        user
                                            ? t("form.placeholders.keepCurrentPassword")
                                            : t("form.placeholders.password")
                                    }
                                    aria-label={t("form.fields.password")}
                                />
                                <FieldError>{fieldState.error?.message}</FieldError>
                            </Field>
                        )}
                    />

                    <Controller
                        control={form.control}
                        name="roleId"
                        render={({ field, fieldState }) => (
                            <Field invalid={fieldState.invalid} orientation="responsive">
                                <FieldLabel>{t("form.fields.role")}</FieldLabel>
                                <Select
                                    collection={roleCollection}
                                    name={field.name}
                                    onValueChange={(item) => {
                                        const roleId = item.value[0] ?? "";
                                        setSelectedRoleId(roleId);
                                        form.setValue("roleId", roleId, {
                                            shouldDirty: true,
                                            shouldValidate: true,
                                        });
                                    }}
                                    value={field.value ? [field.value] : []}
                                >
                                    <SelectTrigger className="w-full min-w-32">
                                        <SelectValue placeholder={tCommon("placeholders.select")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {roleCollection.items.map((role) => (
                                            <SelectItem key={role.value} item={role}>
                                                {role.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FieldError>{fieldState.error?.message}</FieldError>
                            </Field>
                        )}
                    />

                    {isSelectedRoleBranchScoped ? (
                        <Controller
                            control={form.control}
                            name="branchId"
                            render={({ field, fieldState }) => (
                                <Field invalid={fieldState.invalid} orientation="responsive">
                                    <FieldLabel>{t("form.fields.branch")}</FieldLabel>
                                    <Select
                                        collection={branchCollection}
                                        name={field.name}
                                        onValueChange={(item) => {
                                            form.setValue("branchId", item.value[0], {
                                                shouldDirty: true,
                                                shouldValidate: true,
                                            });
                                        }}
                                        value={field.value ? [field.value] : []}
                                    >
                                        <SelectTrigger className="w-full min-w-32">
                                            <SelectValue placeholder={tCommon("placeholders.select")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {branchCollection.items.map((branch) => (
                                                <SelectItem key={branch.value} item={branch}>
                                                    {branch.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FieldError>{fieldState.error?.message}</FieldError>
                                </Field>
                            )}
                        />
                    ) : null}
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
                            {tCommon("actions.cancel")}
                        </Button>
                    )}
                </SheetClose>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="animate-spin" />}
                    {submitLabel ?? (user ? tCommon("actions.saveChanges") : t("form.submit.createUser"))}
                </Button>
            </SheetFooter>
        </form>
    );
}
