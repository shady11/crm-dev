import {useEffect, useState} from "react";
import {useMutation} from "@tanstack/react-query";
import {toast} from "@/components/ui/toast.tsx";
import {useTranslation} from "react-i18next";
import {Eye} from "lucide-react";
import {Alert, AlertAction, AlertDescription, AlertTitle} from "@/components/ui/alert.tsx";
import {Button} from "@/components/ui/button.tsx";
import {endImpersonation} from "../api/auth.api";
import {authStorage} from "../utils/auth-storage";
import {useAuth} from "../hooks/use-auth";

/**
 * Persistent while an impersonated session is active — the one requirement
 * of US-A1 that has no other affordance in the UI, since nothing else marks
 * a session as "not actually you."
 *
 * SA-5: it also counts down to the session's end, and says so after the
 * app switched back to the platform admin's own session on its own (see
 * lib/api.ts), since that happens with a page load.
 */
export function ImpersonationBanner() {
    const {t} = useTranslation("common");
    const {user} = useAuth();
    const minutesLeft = useMinutesLeft(user?.impersonation?.expiresAt);

    useEffect(() => {
        const flash = authStorage.takeFlash();
        if (flash === "impersonation.ended") toast.info({title: t("impersonation.ended")});
    }, [t]);

    const exit = useMutation({
        mutationFn: endImpersonation,
        onSuccess: ({accessToken}) => {
            const returnTo = authStorage.getImpersonationReturn() ?? `/companies/${user?.companyId}`;
            authStorage.setToken(accessToken);
            authStorage.clearImpersonatorToken();
            // A full load, so nothing of the user's session (cached queries,
            // the notifications socket, route guards) carries over.
            window.location.assign(returnTo);
        },
        onError: () => toast.error({title: t("impersonation.exitError")}),
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
            {minutesLeft !== null ? (
                <AlertDescription>{t("impersonation.minutesLeft", {count: minutesLeft})}</AlertDescription>
            ) : null}
            <AlertAction>
                <Button size="sm" variant="ghost" disabled={exit.isPending} onClick={() => exit.mutate()}>
                    {exit.isPending ? t("impersonation.exiting") : t("impersonation.exit")}
                </Button>
            </AlertAction>
        </Alert>
    );
}

/** Whole minutes until `expiresAt`, refreshed every 15 seconds; null without one. */
function useMinutesLeft(expiresAt: string | undefined): number | null {
    const [now, setNow] = useState<number | null>(null);

    useEffect(() => {
        if (!expiresAt) return;
        const tick = () => setNow(Date.now());
        tick();
        const timer = window.setInterval(tick, 15_000);
        return () => window.clearInterval(timer);
    }, [expiresAt]);

    if (!expiresAt || now === null) return null;
    return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / 60_000));
}
