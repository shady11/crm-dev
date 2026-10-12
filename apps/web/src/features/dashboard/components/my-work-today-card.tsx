import {Link} from "react-router-dom";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {paths} from "@/routes/paths.ts";
import {Badge} from "@/components/ui/badge.tsx";
import type {MyWorkToday} from "@/features/dashboard/api/dashboard.api.ts";
import {useTranslation} from "react-i18next";
import {DEAL_STATUS_LABEL_KEYS, DealStatus} from "@/features/deals/types/deal.types.ts";

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
                                <Link key={lead.id} to={paths.leadDetail(lead.id)} className="-mx-2 block rounded-md px-2 py-1 text-sm hover:bg-secondary/40">
                                    <p className="truncate font-medium">{lead.fullName}</p>
                                    <p className="text-xs text-muted-foreground">{formatDate(lead.nextContactAt)}</p>
                                </Link>
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
                                <Link key={task.id} to={paths.tasks.root} className="-mx-2 block rounded-md px-2 py-1 text-sm hover:bg-secondary/40">
                                    <p className="truncate font-medium">{task.title}</p>
                                    <p className="text-xs text-muted-foreground">{formatDate(task.dueDate)}</p>
                                </Link>
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
                                <Link key={deal.id} to={paths.deals.detail(deal.id)} className="-mx-2 flex items-center justify-between gap-2 rounded-md px-2 py-1 text-sm hover:bg-secondary/40">
                                    <div className="min-w-0">
                                        <p className="truncate font-medium">{deal.client.fullName}</p>
                                        <p className="text-xs text-muted-foreground">№{deal.unit.number}</p>
                                    </div>
                                    <Badge variant="secondary">{t(DEAL_STATUS_LABEL_KEYS[deal.status as DealStatus])}</Badge>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>
            </CardContent>
        </Card>
    );
}
