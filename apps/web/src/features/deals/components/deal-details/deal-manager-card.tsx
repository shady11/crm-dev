import {UserCogIcon} from "lucide-react";
import {Card, CardContent, CardHeader} from "@/components/ui/card.tsx";
import {Avatar, AvatarFallback} from "@/components/ui/avatar.tsx";
import {initials} from "@/features/deals/utils/format.ts";
import type {Deal} from "@/features/deals/api/deals.api.ts";
import {USER_ROLE_LABELS} from "@/features/users/types/user.types.ts";

export function DealManagerCard({ manager }: { manager: Deal["manager"] }) {
    return (
        <Card className="border border-secondary shadow-none flex-1 pt-0">
            <CardHeader title="Manager" className="py-4 border-b gap-0"></CardHeader>
            <CardContent className="flex items-center gap-3">
                <Avatar className="size-10">
                    <AvatarFallback>
                        {manager ? initials(manager.fullName) : <UserCogIcon size={16} />}
                    </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-1">
                    <p className="font-medium">{manager?.fullName ?? "Unassigned"}</p>
                    <p className="flex items-center gap-2 text-sm  text-muted-foreground">
                        {USER_ROLE_LABELS[manager?.role]}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}