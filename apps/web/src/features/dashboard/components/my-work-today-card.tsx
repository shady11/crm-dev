import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {Badge} from "@/components/ui/badge.tsx";
import type {MyWorkToday} from "@/features/dashboard/api/dashboard.api.ts";
import {useTranslation} from "react-i18next";

// SM-A2: one screen showing what a SALES_MANAGER needs to do today — leads
// waiting on follow-up, tasks due today, and deals waiting on the client —
// instead of checking three separate filtered list pages every morning.
export function MyWorkTodayCard({data}: {data: MyWorkToday}) {
    const {t, i18n} = useTranslation("dashboard");

    function formatDate(iso: string | null) {
        if (!iso) return t("myWorkToday.noDate");
        return new Date(iso).toLocaleDateString(i18n.language, {month: "short", day: "numeric"});
    }

    return (
        <Card className="border border-secondary shadow-none pt-0">
            <CardHeader className="border-b py-4">
                <CardTitle className="text-sm text-muted-foreground">{t("myWorkToday.title")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-3">
                <section className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase">
                        {t("myWorkToday.leadsHeading", {count: data.leadsNeedingFollowUp.length})}
                    </h4>
                    {data.leadsNeedingFollowUp.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("myWorkToday.leadsEmpty")}</p>
                    ) : (
                        <div className="space-y-2">
                            {data.leadsNeedingFollowUp.map((lead) => (
                                <div key={lead.id} className="text-sm">
                                    <p className="truncate font-medium">{lead.fullName}</p>
                                    <p className="text-xs text-muted-foreground">{formatDate(lead.nextContactAt)}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase">
                        {t("myWorkToday.tasksHeading", {count: data.tasksDueToday.length})}
                    </h4>
                    {data.tasksDueToday.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("myWorkToday.tasksEmpty")}</p>
                    ) : (
                        <div className="space-y-2">
                            {data.tasksDueToday.map((task) => (
                                <div key={task.id} className="text-sm">
                                    <p className="truncate font-medium">{task.title}</p>
                                    <p className="text-xs text-muted-foreground">{formatDate(task.dueDate)}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase">
                        {t("myWorkToday.dealsHeading", {count: data.dealsWaitingOnClient.length})}
                    </h4>
                    {data.dealsWaitingOnClient.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("myWorkToday.dealsEmpty")}</p>
                    ) : (
                        <div className="space-y-2">
                            {data.dealsWaitingOnClient.map((deal) => (
                                <div key={deal.id} className="flex items-center justify-between gap-2 text-sm">
                                    <div className="min-w-0">
                                        <p className="truncate font-medium">{deal.client.fullName}</p>
                                        <p className="text-xs text-muted-foreground">№{deal.unit.number}</p>
                                    </div>
                                    <Badge variant="secondary">{deal.status}</Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </CardContent>
        </Card>
    );
}
