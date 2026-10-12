import {Link} from "react-router-dom";
import {Card, CardAction, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {paths} from "@/routes/paths.ts";
import {Avatar, AvatarFallback} from "@/components/ui/avatar.tsx";
import {initials} from "@/features/deals/utils/format.ts";
import type {TeamSnapshotItem} from "@/features/dashboard/api/dashboard.api.ts";
import {useTranslation} from "react-i18next";
import {timeAgo} from "@/features/dashboard/utils/time-ago.ts";

// SH-A2: a SALES_HEAD's daily-standup view of their own team — counts and a
// "last activity" timestamp per SALES_MANAGER, deliberately not full
// reporting. Same shape as CA-E1's branch comparison, scoped down to one
// branch's managers.
export function TeamSnapshotCard({data}: {data: TeamSnapshotItem[]}) {
    const {t} = useTranslation("dashboard");

    return (
        <Card className="border border-secondary shadow-none pt-0">
            <CardHeader className="border-b py-4">
                <CardTitle className="text-sm text-muted-foreground">{t("teamSnapshot.title")}</CardTitle>
                <CardAction>
                    <Link to={paths.users} className="text-xs font-medium text-primary hover:underline">{t("teamSnapshot.openTeam")}</Link>
                </CardAction>
            </CardHeader>
            <CardContent>
                {data.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">{t("teamSnapshot.empty")}</p>
                ) : (
                    <div className="flex flex-col divide-y">
                        {data.map((item) => (
                            <Link
                                key={item.manager.id}
                                to={paths.deals.byManager(item.manager.id)}
                                className="flex items-center gap-3 rounded-md px-2 py-2.5 text-sm hover:bg-secondary/40"
                            >
                                <Avatar className="size-8 shrink-0">
                                    <AvatarFallback>{initials(item.manager.fullName)}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-medium">{item.manager.fullName}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {t("teamSnapshot.openLeads", {count: item.openLeads})}
                                        {" · "}
                                        {t("teamSnapshot.activeDeals", {count: item.activeDeals})}
                                        {" · "}
                                        {t("teamSnapshot.tasksDue", {count: item.tasksDue})}
                                    </p>
                                </div>
                                <p className="shrink-0 text-xs text-muted-foreground">
                                    {item.lastActivityAt ? timeAgo(t, item.lastActivityAt) : t("teamSnapshot.noActivity")}
                                </p>
                            </Link>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
