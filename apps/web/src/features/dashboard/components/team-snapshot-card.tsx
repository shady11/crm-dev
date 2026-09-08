import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {Avatar, AvatarFallback} from "@/components/ui/avatar.tsx";
import {initials} from "@/features/deals/utils/format.ts";
import type {TeamSnapshotItem} from "@/features/dashboard/api/dashboard.api.ts";
import {useTranslation} from "react-i18next";

// SH-A2: a SALES_HEAD's daily-standup view of their own team — counts and a
// "last activity" timestamp per SALES_MANAGER, deliberately not full
// reporting. Same shape as CA-E1's branch comparison, scoped down to one
// branch's managers.
export function TeamSnapshotCard({data}: {data: TeamSnapshotItem[]}) {
    const {t} = useTranslation("dashboard");

    function timeAgo(iso: string) {
        const diffMs = Date.now() - new Date(iso).getTime();
        const mins = Math.floor(diffMs / 60000);
        if (mins < 1) return t("recentActivity.justNow");
        if (mins < 60) return t("recentActivity.minutesAgo", {count: mins});
        const hours = Math.floor(mins / 60);
        if (hours < 24) return t("recentActivity.hoursAgo", {count: hours});
        return t("recentActivity.daysAgo", {count: Math.floor(hours / 24)});
    }

    return (
        <Card className="border border-secondary shadow-none pt-0">
            <CardHeader className="border-b py-4">
                <CardTitle className="text-sm text-muted-foreground">{t("teamSnapshot.title")}</CardTitle>
            </CardHeader>
            <CardContent>
                {data.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">{t("teamSnapshot.empty")}</p>
                ) : (
                    <div className="flex flex-col divide-y">
                        {data.map((item) => (
                            <div key={item.manager.id} className="flex items-center gap-3 py-2.5 text-sm">
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
                                    {item.lastActivityAt ? timeAgo(item.lastActivityAt) : t("teamSnapshot.noActivity")}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
