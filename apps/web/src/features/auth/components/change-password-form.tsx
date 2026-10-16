import {useMemo} from "react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {isAxiosError} from "axios";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {z} from "zod";
import {Loader2} from "lucide-react";
import {SettingsSectionHeader} from "@/components/shared/settings-layout.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Field, FieldError, FieldGroup, FieldLabel} from "@/components/ui/field.tsx";
import {toast} from "@/components/ui/toast.tsx";
import {changeOwnPassword} from "@/features/auth/api/auth.api.ts";
import {authStorage} from "@/features/auth/utils/auth-storage.ts";
import {isStrongPassword} from "@/lib/password-policy.ts";

type PasswordFormValues = {
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
};

/**
 * Choosing a new password: on the profile page, and on its own screen when
 * the current one was set by someone else and must be replaced (SA-6).
 */
export function ChangePasswordForm({
    title,
    description,
    onChanged,
}: {
    title: string;
    description: string;
    onChanged?(): void;
}) {
    const {t} = useTranslation("settings");
    const queryClient = useQueryClient();

    // Rebuilt whenever the language changes, so a validation message that
    // fired before a language switch doesn't stay frozen in the old language
    // — same pattern as LoginForm's schema.
    const passwordSchema = useMemo(
        () =>
            z
                .object({
                    currentPassword: z.string().min(1, t("profile.password.hint")),
                    // Same rule as ChangePasswordDto, so a weak password is
                    // caught here instead of coming back from the API.
                    newPassword: z.string().refine(isStrongPassword, t("profile.password.hint")),
                    confirmNewPassword: z.string(),
                })
                .refine((values) => values.newPassword === values.confirmNewPassword, {
                    message: t("profile.password.mismatch"),
                    path: ["confirmNewPassword"],
                }),
        [t],
    );

    const form = useForm<PasswordFormValues>({
        resolver: zodResolver(passwordSchema),
        defaultValues: {currentPassword: "", newPassword: "", confirmNewPassword: ""},
    });

    const mutation = useMutation({
        mutationFn: (values: PasswordFormValues) =>
            changeOwnPassword({currentPassword: values.currentPassword, newPassword: values.newPassword}),
        onSuccess: async ({accessToken}) => {
            // The API bumps sessionsValidFrom on every password change (every
            // other session dies), which includes the token this very request
            // was made with — swap in the fresh one it returns or the next
            // request 401s the caller out of their own change.
            authStorage.setToken(accessToken);
            await queryClient.invalidateQueries({queryKey: ["auth", "me"]});
            form.reset();
            onChanged?.();
            toast.success({
                title: t("profile.password.toasts.updateSuccessTitle"),
                description: t("profile.password.toasts.updateSuccessDescription"),
            });
        },
        onError: (error) => {
            if (isAxiosError(error) && error.response?.status === 401) {
                form.setError("currentPassword", {message: t("profile.password.toasts.incorrectCurrentPassword")});
                return;
            }

            if (isAxiosError(error) && error.response?.status === 400) {
                form.setError("newPassword", {message: t("profile.password.toasts.sameAsCurrentPassword")});
                return;
            }

            toast.error({
                title: t("profile.password.toasts.updateErrorTitle"),
                description: t("profile.password.toasts.updateErrorDescription"),
            });
        },
    });

    const errors = form.formState.errors;

    return (
        <form className="space-y-5" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
            <SettingsSectionHeader title={title} description={description} />

            <FieldGroup className="gap-5">
                <Field invalid={!!errors.currentPassword}>
                    <FieldLabel htmlFor="currentPassword">
                        {t("profile.password.fields.currentPassword")}
                    </FieldLabel>
                    <Input
                        id="currentPassword"
                        type="password"
                        autoComplete="current-password"
                        disabled={mutation.isPending}
                        aria-invalid={!!errors.currentPassword}
                        {...form.register("currentPassword")}
                    />
                    <FieldError>{errors.currentPassword?.message}</FieldError>
                </Field>

                <Field invalid={!!errors.newPassword}>
                    <FieldLabel htmlFor="newPassword">{t("profile.password.fields.newPassword")}</FieldLabel>
                    <Input
                        id="newPassword"
                        type="password"
                        autoComplete="new-password"
                        disabled={mutation.isPending}
                        aria-invalid={!!errors.newPassword}
                        {...form.register("newPassword")}
                    />
                    <FieldError>{errors.newPassword?.message ?? t("profile.password.hint")}</FieldError>
                </Field>

                <Field invalid={!!errors.confirmNewPassword}>
                    <FieldLabel htmlFor="confirmNewPassword">
                        {t("profile.password.fields.confirmNewPassword")}
                    </FieldLabel>
                    <Input
                        id="confirmNewPassword"
                        type="password"
                        autoComplete="new-password"
                        disabled={mutation.isPending}
                        aria-invalid={!!errors.confirmNewPassword}
                        {...form.register("confirmNewPassword")}
                    />
                    <FieldError>{errors.confirmNewPassword?.message}</FieldError>
                </Field>
            </FieldGroup>

            <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="animate-spin" />}
                {t("profile.password.submit")}
            </Button>
        </form>
    );
}
