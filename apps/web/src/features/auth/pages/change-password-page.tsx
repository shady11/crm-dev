import {useQueryClient} from "@tanstack/react-query";
import {useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {Button} from "@/components/ui/button.tsx";
import {Card, CardContent} from "@/components/ui/card.tsx";
import {authStorage} from "@/features/auth/utils/auth-storage.ts";
import {ChangePasswordForm} from "@/features/auth/components/change-password-form.tsx";
import {useAuth} from "@/features/auth/hooks/use-auth.ts";
import {landingPathFor} from "@/features/auth/access.ts";

/**
 * SA-6: the one screen someone sees while their password is one that a
 * reset or an admin set for them. Outside the app layout, since the API
 * refuses everything else until a new one is chosen.
 */
export function ChangePasswordPage() {
    const {t} = useTranslation("settings");
    const {user} = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    return (
        <div className="bg-muted flex min-h-svh items-center justify-center p-6">
            <Card className="w-full max-w-md">
                <CardContent className="pt-6">
                    <ChangePasswordForm
                        title={t("profile.password.required.title")}
                        description={t("profile.password.required.description", {email: user?.email ?? ""})}
                        onChanged={async () => {
                            await queryClient.refetchQueries({queryKey: ["auth", "me"]});
                            navigate(landingPathFor(user), {replace: true});
                        }}
                    />
                    {/* A way out for someone who can't use the password they were given. */}
                    <Button
                        variant="link"
                        className="text-muted-foreground mt-4 px-0"
                        onClick={() => {
                            authStorage.clear();
                            window.location.assign("/login");
                        }}
                    >
                        {t("profile.password.required.signOut")}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
