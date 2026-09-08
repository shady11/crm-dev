import {useNavigate} from "react-router-dom";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {toast} from "sonner";
import {useTranslation} from "react-i18next";
import {Eye} from "lucide-react";
import {Alert, AlertAction, AlertTitle} from "@/components/ui/alert.tsx";
import {Button} from "@/components/ui/button.tsx";
import {endImpersonation} from "../api/auth.api";
import {authStorage} from "../utils/auth-storage";
import {useAuth} from "../hooks/use-auth";

/**
 * Persistent while an impersonated session is active — the one requirement
 * of US-A1 that has no other affordance in the UI, since nothing else marks
 * a session as "not actually you."
 */
export function ImpersonationBanner() {
    const {t} = useTranslation("common");
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const {user} = useAuth();

    const exit = useMutation({
        mutationFn: endImpersonation,
        onSuccess: ({accessToken}) => {
            authStorage.setToken(accessToken);
            authStorage.clearImpersonatorToken();
            void queryClient.invalidateQueries({queryKey: ["auth", "me"]});
            navigate(`/companies/${user?.companyId}`);
        },
        onError: () => toast.error(t("impersonation.exitError")),
    });

    if (!user?.impersonation) {
        return null;
    }

    return (
        <Alert variant="warning" className="rounded-none border-x-0 border-t-0">
            <Eye />
            <AlertTitle>
                {t("impersonation.banner", {name: user.name, company: user.company?.name ?? ""})}
            </AlertTitle>
            <AlertAction>
                <Button size="sm" variant="ghost" disabled={exit.isPending} onClick={() => exit.mutate()}>
                    {exit.isPending ? t("impersonation.exiting") : t("impersonation.exit")}
                </Button>
            </AlertAction>
        </Alert>
    );
}
