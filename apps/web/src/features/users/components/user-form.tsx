import {useEffect, useState} from "react";
import {zodResolver} from "@hookform/resolvers/zod";
import {Loader2, TriangleAlert} from "lucide-react";
import {Controller, useForm} from "react-hook-form";
import {z} from "zod";

import {Button} from "@/components/ui/button.tsx";
import {Field, FieldError, FieldGroup, FieldLabel} from "@/components/ui/field.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {SheetBody, SheetClose, SheetFooter} from "@/components/ui/sheet.tsx";
import {createListCollection} from "@ark-ui/react";
import {Alert, AlertTitle} from "@/components/ui/alert.tsx";
import type {CreateUserPayload, UpdateUserPayload} from "@/features/users/api/users.api";
import {
    getVisibleRoles,
    normalizeUserRole,
    type User,
    USER_ROLE_LABELS,
    USER_ROLE_VALUES,
    UserRole,
} from "@/features/users/types/user.types";
import {useAuth} from "@/features/auth/hooks/use-auth.ts";

const baseSchema = z.object({
    fullName: z.string().trim().min(2, "Name must be at least 2 characters"),
    email: z.string().trim().email("Invalid email"),
    phone: z.string().trim().optional(),
    role: z.enum(USER_ROLE_VALUES, "Select a role"),
});

const createUserSchema = baseSchema.extend({
    password: z.string().min(6, "Password must be at least 6 characters"),
});

const editUserSchema = baseSchema.extend({
    password: z
        .string()
        .min(6, "Password must be at least 6 characters")
        .optional()
        .or(z.literal("")),
});

type UserFormValues = z.infer<typeof editUserSchema>;

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
    role: UserRole.SALES_MANAGER,
};

export function UserForm({
                             user,
                             errorMessage,
                             isSubmitting = false,
                             submitLabel,
                             onCancel,
                             onSubmit,
                         }: UserFormProps) {
    const { user: currentUser } = useAuth();
    const visibleRoles = getVisibleRoles(currentUser?.role);

    const initialRole = normalizeUserRole(user?.role);
    const [, setSelectedRole] = useState<UserRole>(initialRole);

    const form = useForm<UserFormValues>({
        resolver: zodResolver(user ? editUserSchema : createUserSchema),
        defaultValues: { ...DEFAULT_VALUES, role: initialRole },
    });

    useEffect(() => {
        form.reset({
            fullName: user?.fullName ?? "",
            email: user?.email ?? "",
            phone: user?.phone ?? "",
            password: "",
            role: initialRole,
        });
    }, [form, initialRole, user]);

    const handleSubmit = (values: UserFormValues) => {
        if (user) {
            const payload: UpdateUserPayload = {
                fullName: values.fullName.trim(),
                email: values.email.trim(),
                phone: values.phone?.trim() || undefined,
                role: values.role,
            };
            onSubmit(payload);
            return;
        }

        onSubmit({
            fullName: values.fullName.trim(),
            email: values.email.trim(),
            phone: values.phone?.trim() || undefined,
            password: values.password!,
            role: values.role,
        });
    };

    const roleCollection = createListCollection({
        items: visibleRoles.map((role) => ({
            label: USER_ROLE_LABELS[role],
            value: role,
        })),
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
                                <FieldLabel>Full name</FieldLabel>
                                <Input {...field} placeholder="Full name" aria-label="Full name" />
                                <FieldError>{fieldState.error?.message}</FieldError>
                            </Field>
                        )}
                    />

                    <Controller
                        control={form.control}
                        name="email"
                        render={({ field, fieldState }) => (
                            <Field invalid={fieldState.invalid}>
                                <FieldLabel>Email</FieldLabel>
                                <Input {...field} type="email" placeholder="name@company.com" aria-label="Email" />
                                <FieldError>{fieldState.error?.message}</FieldError>
                            </Field>
                        )}
                    />

                    <Controller
                        control={form.control}
                        name="phone"
                        render={({ field, fieldState }) => (
                            <Field invalid={fieldState.invalid}>
                                <FieldLabel>Phone (optional)</FieldLabel>
                                <Input {...field} placeholder="Phone" aria-label="Phone" />
                                <FieldError>{fieldState.error?.message}</FieldError>
                            </Field>
                        )}
                    />

                    <Controller
                        control={form.control}
                        name="password"
                        render={({ field, fieldState }) => (
                            <Field invalid={fieldState.invalid}>
                                <FieldLabel>{user ? "New password (optional)" : "Password"}</FieldLabel>
                                <Input
                                    {...field}
                                    type="password"
                                    placeholder={user ? "Leave blank to keep current password" : "Password"}
                                    aria-label="Password"
                                />
                                <FieldError>{fieldState.error?.message}</FieldError>
                            </Field>
                        )}
                    />

                    <Controller
                        control={form.control}
                        name="role"
                        render={({ field, fieldState }) => (
                            <Field invalid={fieldState.invalid} orientation="responsive">
                                <FieldLabel>Role</FieldLabel>
                                <Select
                                    collection={roleCollection}
                                    name={field.name}
                                    onValueChange={(item) => {
                                        const role = item.value[0] as UserRole;
                                        setSelectedRole(role);
                                        form.setValue("role", role, {
                                            shouldDirty: true,
                                            shouldValidate: true,
                                        });
                                    }}
                                    value={[field.value]}
                                >
                                    <SelectTrigger className="w-full min-w-32">
                                        <SelectValue placeholder="Select" />
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
                            Cancel
                        </Button>
                    )}
                </SheetClose>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="animate-spin" />}
                    {submitLabel ?? (user ? "Save changes" : "Create user")}
                </Button>
            </SheetFooter>
        </form>
    );
}