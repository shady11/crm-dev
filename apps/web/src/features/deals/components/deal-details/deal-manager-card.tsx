import {RepeatIcon, UserCogIcon} from "lucide-react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {Avatar, AvatarFallback} from "@/components/ui/avatar.tsx";
import {Button} from "@/components/ui/button.tsx";
import {initials} from "@/features/deals/utils/format.ts";
import type {Deal} from "@/features/deals/api/deals.api.ts";
import {USER_ROLE_LABEL_KEYS} from "@/features/users/types/user.types.ts";
import {useTranslation} from "react-i18next";

type Props = {
    manager: Deal["manager"];
    // SH-A1: shown only for a SALES_HEAD viewing a deal, to reassign it to a
    // different SALES_MANAGER on their team.
    canReassign?: boolean;
    onReassign?(): void;
};

export function DealManagerCard({ manager, canReassign, onReassign }: Props) {
    const { t } = useTranslation(["users", "deals"]);

    return (
        <Card className="border border-secondary shadow-none flex-1 pt-0">
            <CardHeader className="flex items-center justify-between border-b py-4 gap-0">
                <CardTitle>{t("managerCard.title", { ns: "deals" })}</CardTitle>
                {canReassign && (
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t("reassignDialog.title", { ns: "users" })}
                        onClick={onReassign}
                    >
                        <RepeatIcon className="size-4" />
                    </Button>
                )}
            </CardHeader>
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