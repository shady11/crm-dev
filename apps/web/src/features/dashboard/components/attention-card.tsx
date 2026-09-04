import {Link} from "react-router-dom";
import {AlertTriangleIcon, ClockIcon} from "lucide-react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {paths} from "@/routes/paths.ts";
import type {AttentionItems} from "@/features/dashboard/api/dashboard.api.ts";
import {useTranslation} from "react-i18next";

function daysUntil(iso: string) {
    return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function AttentionCard({ data }: { data: AttentionItems }) {
    const { t } = useTranslation("dashboard");
    const hasNothing = data.expiringDeals.length === 0 && data.urgentTasks.length === 0;

    return (
        <Card className="border border-secondary shadow-none pt-0">
            <CardHeader className="border-b py-4">
                <CardTitle className="text-sm text-muted-foreground">{t("attention.title")}</CardTitle>
            </CardHeader>
            <CardContent>
                {hasNothing ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">{t("attention.empty")}</p>
                ) : (
                    <div className="flex flex-col divide-y">
                        {data.expiringDeals.map((deal) => {
                            const days = daysUntil(deal.reservationExpiresAt);
                            return (
                                <Link key={deal.id} to={paths.deals.detail(deal.id)} className="flex items-center gap-3 py-2.5 text-sm hover:bg-secondary/40">
                                    <ClockIcon size={16} className={`shrink-0 ${days <= 1 ? "text-destructive" : "text-amber-500"}`} />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium">{deal.dealNumber} · {deal.client.fullName}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {days <= 0 ? t("attention.reservationExpired") : t("attention.reservationExpiresIn", { days })}
                                        </p>
                                    </div>
                                </Link>
                            );
                        })}
                        {data.urgentTasks.map((task) => {
                            const days = daysUntil(task.dueDate);
                            return (
                                <div key={task.id} className="flex items-center gap-3 py-2.5 text-sm">
                                    <AlertTriangleIcon size={16} className={`shrink-0 ${days < 0 ? "text-destructive" : "text-amber-500"}`} />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium">{task.title}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {task.assignedTo.fullName} · {days < 0 ? t("attention.taskOverdue") : days === 0 ? t("attention.taskDueToday") : t("attention.taskDueIn", { days })}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}