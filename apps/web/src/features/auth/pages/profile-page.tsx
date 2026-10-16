import {useEffect, useState} from "react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {KeyRound, UserRound} from "lucide-react";
import {SettingsLayout, SettingsSectionHeader} from "@/components/shared/settings-layout.tsx";
import {useSettingsSection} from "@/components/shared/use-settings-section.ts";
import {Button} from "@/components/ui/button.tsx";
import {Input} from "@/components/ui/input.tsx";
import {toast} from "@/components/ui/toast.tsx";
import {updateOwnProfile, type UpdateOwnProfilePayload} from "@/features/auth/api/auth.api.ts";
import {ChangePasswordForm} from "@/features/auth/components/change-password-form.tsx";
import {useAuth} from "@/features/auth/hooks/use-auth.ts";

const SECTION_IDS = ["general", "password"] as const;

// SM-A1: lets any signed-in user fix their own name/phone — previously the
// only self-service action was changing a password, so a typo at onboarding
// meant filing a request with an admin.
export function ProfilePage() {
    const {t} = useTranslation("settings");
    const [activeSection, selectSection] = useSettingsSection(SECTION_IDS);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">{t("profile.page.heading")}</h2>
                <p className="text-sm text-muted-foreground">{t("profile.page.description")}</p>
            </div>

            <SettingsLayout
                sections={[
                    {id: "general", label: t("profile.tabs.general"), icon: UserRound},
                    {id: "password", label: t("profile.tabs.password"), icon: KeyRound},
                ]}
                activeSection={activeSection}
                onSelect={selectSection}
            >
                {activeSection === "general" && <GeneralPanel />}
                {activeSection === "password" && (
                    <ChangePasswordForm
                        title={t("profile.tabs.password")}
                        description={t("profile.password.description")}
                    />
                )}
            </SettingsLayout>
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
        <form
            className="space-y-5"
            onSubmit={(event) => {
                event.preventDefault();
                updateMutation.mutate(form);
            }}
        >
            <SettingsSectionHeader title={t("profile.tabs.general")} />

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
    );
}

