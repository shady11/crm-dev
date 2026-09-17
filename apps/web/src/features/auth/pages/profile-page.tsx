import {useEffect, useMemo, useState} from "react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {isAxiosError} from "axios";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {z} from "zod";
import {Loader2} from "lucide-react";
import {Button} from "@/components/ui/button.tsx";
import {Card, CardContent, CardHeader, CardDescription} from "@/components/ui/card.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Field, FieldError, FieldGroup, FieldLabel} from "@/components/ui/field.tsx";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs.tsx";
import {toast} from "@/components/ui/toast.tsx";
import {changeOwnPassword, updateOwnProfile, type UpdateOwnProfilePayload} from "@/features/auth/api/auth.api.ts";
import {useAuth} from "@/features/auth/hooks/use-auth.ts";
import {authStorage} from "@/features/auth/utils/auth-storage.ts";

type ProfileTab = "general" | "password";

// SM-A1: lets any signed-in user fix their own name/phone — previously the
// only self-service action was changing a password, so a typo at onboarding
// meant filing a request with an admin.
export function ProfilePage() {
    const {t} = useTranslation("settings");
    const [activeTab, setActiveTab] = useState<ProfileTab>("general");

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-medium tracking-tight">{t("profile.page.heading")}</h2>
                <p className="text-sm text-muted-foreground">{t("profile.page.description")}</p>
            </div>

            <Tabs value={activeTab} onValueChange={({value}) => setActiveTab(value as ProfileTab)}>
                <TabsList>
                    <TabsTrigger value="general">{t("profile.tabs.general")}</TabsTrigger>
                    <TabsTrigger value="password">{t("profile.tabs.password")}</TabsTrigger>
                </TabsList>

                <TabsContent value="general">
                    <GeneralPanel />
                </TabsContent>

                <TabsContent value="password">
                    <ChangePasswordCard />
                </TabsContent>
            </Tabs>
        </div>
    );
}

function GeneralPanel() {
    const {t} = useTranslation("settings");
    const {t: tCommon} = useTranslation("common");
    const queryClient = useQueryClient();
    const {user} = useAuth();

    const [form, setForm] = useState<UpdateOwnProfilePayload>({fullName: "", phone: ""});

    useEffect(() => {
        if (!user) return;
        setForm({fullName: user.name, phone: user.phone ?? ""});
    }, [user]);

    const updateMutation = useMutation({
        mutationFn: (payload: UpdateOwnProfilePayload) => updateOwnProfile(payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({queryKey: ["auth", "me"]});
            toast.success({
                title: t("profile.toasts.updateSuccessTitle"),
                description: t("profile.toasts.updateSuccessDescription"),
            });
        },
        onError: () => {
            toast.error({
                title: t("profile.toasts.updateErrorTitle"),
                description: t("profile.toasts.updateErrorDescription"),
            });
        },
    });

    return (
        <Card className="max-w-xl border border-secondary shadow-none">
            <CardContent>
                <form
                    className="space-y-5"
                    onSubmit={(event) => {
                        event.preventDefault();
                        updateMutation.mutate(form);
                    }}
                >
                    <label className="block space-y-1.5">
                        <span className="text-sm font-medium">{t("profile.fields.fullName")}</span>
                        <Input
                            aria-label={t("profile.fields.fullName")}
                            value={form.fullName}
                            onChange={(event) => setForm((prev) => ({...prev, fullName: event.target.value}))}
                        />
                    </label>

                    <label className="block space-y-1.5">
                        <span className="text-sm font-medium">{t("profile.fields.email")}</span>
                        <Input aria-label={t("profile.fields.email")} value={user?.email ?? ""} disabled />
                    </label>

                    <label className="block space-y-1.5">
                        <span className="text-sm font-medium">{t("profile.fields.phone")}</span>
                        <Input
                            aria-label={t("profile.fields.phone")}
                            value={form.phone}
                            onChange={(event) => setForm((prev) => ({...prev, phone: event.target.value}))}
                        />
                    </label>

                    <Button type="submit" disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? tCommon("actions.saving") : tCommon("actions.saveChanges")}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

type PasswordFormValues = {
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
};

function ChangePasswordCard() {
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
                    // The strength check itself is enforced server-side (see
                    // ChangePasswordDto) — this is just the client-side length
                    // floor, to catch an obviously-too-short password before a
                    // round trip.
                    newPassword: z.string().min(8, t("profile.password.hint")),
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
        <Card className="max-w-xl border border-secondary shadow-none">
            <CardHeader>
                <CardDescription>{t("profile.password.description")}</CardDescription>
            </CardHeader>
            <CardContent>
                <form className="space-y-5" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
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
            </CardContent>
        </Card>
    );
}
