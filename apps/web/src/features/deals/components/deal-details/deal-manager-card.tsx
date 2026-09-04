import {UserCogIcon} from "lucide-react";
import {Card, CardContent, CardHeader} from "@/components/ui/card.tsx";
import {Avatar, AvatarFallback} from "@/components/ui/avatar.tsx";
import {initials} from "@/features/deals/utils/format.ts";
import type {Deal} from "@/features/deals/api/deals.api.ts";
import {USER_ROLE_LABEL_KEYS} from "@/features/users/types/user.types.ts";
import {useTranslation} from "react-i18next";

export function DealManagerCard({ manager }: { manager: Deal["manager"] }) {
    const { t } = useTranslation(["users", "deals"]);

    return (
        <Card className="border border-secondary shadow-none flex-1 pt-0">
            <CardHeader title={t("managerCard.title", { ns: "deals" })} className="py-4 border-b gap-0"></CardHeader>
            <CardContent className="flex items-center gap-3">
                <Avatar className="size-10">
                    <AvatarFallback>
                        {manager ? initials(manager.fullName) : <UserCogIcon size={16} />}
                    </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-1">
                    <p className="font-medium">{manager?.fullName ?? t("managerCard.unassigned", { ns: "deals" })}</p>
                    <p className="flex items-center gap-2 text-sm  text-muted-foreground">
                        {t(USER_ROLE_LABEL_KEYS[manager!.role])}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}