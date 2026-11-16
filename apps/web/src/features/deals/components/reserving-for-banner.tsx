import {useQuery} from "@tanstack/react-query";
import {UserCheckIcon, XIcon} from "lucide-react";
import {Button} from "@/components/ui/button.tsx";
import {getClient} from "@/features/clients/api/clients.api.ts";
import {useTranslation} from "react-i18next";

/**
 * E2E-8: on the chessboard while reserving for a client, so it's plain who
 * the next booking is for, and easy to stop.
 */
export function ReservingForBanner({clientId, onStop}: {clientId: string; onStop(): void}) {
    const {t} = useTranslation("deals");
    const client = useQuery({
        queryKey: ["client", clientId],
        queryFn: () => getClient(clientId),
    });
    if (!client.data) return null;

    return (
        <div role="status" className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm">
            <UserCheckIcon className="size-4 shrink-0 text-primary" />
            <p className="min-w-0 flex-1">
                {t("reserveFor.banner", {name: client.data.fullName})}
            </p>
            <Button variant="ghost" size="sm" onClick={onStop}>
                <XIcon className="size-3.5" />
                {t("reserveFor.stop")}
            </Button>
        </div>
    );
}
