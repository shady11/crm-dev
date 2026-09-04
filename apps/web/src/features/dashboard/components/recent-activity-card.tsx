import {Link} from "react-router-dom";
import {ActivityIcon} from "lucide-react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {paths} from "@/routes/paths.ts";
import type {RecentActivity} from "@/features/dashboard/api/dashboard.api.ts";
import {useTranslation} from "react-i18next";

export function RecentActivityCard({ activities }: { activities: RecentActivity[] }) {
    const { t } = useTranslation("dashboard");

    function timeAgo(iso: string) {
        const diffMs = Date.now() - new Date(iso).getTime();
        const mins = Math.floor(diffMs / 60000);
        if (mins < 1) return t("recentActivity.justNow");
        if (mins < 60) return t("recentActivity.minutesAgo", { count: mins });
        const hours = Math.floor(mins / 60);
        if (hours < 24) return t("recentActivity.hoursAgo", { count: hours });
        return t("recentActivity.daysAgo", { count: Math.floor(hours / 24) });
    }

    return (
        <Card className="border border-secondary shadow-none pt-0">
            <CardHeader className="border-b py-4">
                <CardTitle className="text-sm text-muted-foreground">{t("recentActivity.title")}</CardTitle>
            </CardHeader>
            <CardContent>
                {activities.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">{t("recentActivity.empty")}</p>
                ) : (
                    <div className="flex flex-col divide-y">
                        {activities.map((a) => {
                            const row = (
                                <div className="flex items-start gap-3 py-2.5 text-sm">
                                    <ActivityIcon size={15} className="mt-0.5 shrink-0 text-muted-foreground" />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate">
                                            <span className="font-medium">{a.user?.fullName ?? t("recentActivity.system")}</span> {a.title.toLowerCase()}
                                            {a.deal && ` · ${a.deal.dealNumber}`}
                                        </p>
                                        <p className="text-xs text-muted-foreground">{timeAgo(a.createdAt)}</p>
                                    </div>
                                </div>
                            );

                            return a.deal ? (
                                <Link key={a.id} to={paths.deals.detail(a.deal.id)} className="hover:bg-secondary/40">
                                    {row}
                                </Link>
                            ) : (
                                <div key={a.id}>{row}</div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}