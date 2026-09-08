import {useEffect, useState} from "react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {Button} from "@/components/ui/button.tsx";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {Input} from "@/components/ui/input.tsx";
import {toast} from "@/components/ui/toast.tsx";
import {updateOwnProfile, type UpdateOwnProfilePayload} from "@/features/auth/api/auth.api.ts";
import {useAuth} from "@/features/auth/hooks/use-auth.ts";

// SM-A1: lets any signed-in user fix their own name/phone — previously the
// only self-service action was changing a password, so a typo at onboarding
// meant filing a request with an admin.
export function ProfilePage() {
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
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-medium tracking-tight">{t("profile.page.heading")}</h2>
                <p className="text-sm text-muted-foreground">{t("profile.page.description")}</p>
            </div>

            <Card className="max-w-xl border border-secondary shadow-none">
                <CardHeader>
                    <CardTitle className="text-base">{t("profile.page.formTitle")}</CardTitle>
                </CardHeader>
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
        </div>
    );
}
