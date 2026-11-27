import {Link} from "react-router-dom";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {Progress} from "@/components/ui/progress.tsx";
import type {DashboardPeriod, SalesSummary} from "@/features/dashboard/api/dashboard.api.ts";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";
import {paths} from "@/routes/paths.ts";
import {useTranslation} from "react-i18next";

// Collections for the period: of the installments that fell due so far,
// how much came in; what the rest of the period still brings; what's
// overdue right now; and the balance still owed across every deal.
export function CollectionsCard({data, period}: {data: SalesSummary["collections"]; period: DashboardPeriod}) {
    const {t} = useTranslation("dashboard");
    const {formatCurrency} = useCompanyFormatters();

    const {dueToDate, duePeriod, overdue, outstanding} = data;
    const share = dueToDate.amount > 0 ? Math.min(100, Math.round((dueToDate.paid / dueToDate.amount) * 100)) : null;

    return (
        <Card className="h-full border">
            <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">{t("collections.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
                <div className="space-y-2">
                    <div className="flex items-baseline justify-between gap-3">
                        <p className="text-xs text-muted-foreground">{t("collections.collectedOfDue")}</p>
                        {share !== null ? <p className="text-sm font-semibold tabular-nums">{share}%</p> : null}
                    </div>
                    {share !== null ? (
                        <>
                            <Progress className="h-1.5" value={share} aria-label={t("collections.collectedOfDue")} />
                            <p className="text-sm tabular-nums">
                                {t("collections.paidOfDue", {paid: formatCurrency(dueToDate.paid), due: formatCurrency(dueToDate.amount)})}
                            </p>
                        </>
                    ) : (
                        <p className="text-sm text-muted-foreground">{t("collections.nothingDueYet")}</p>
                    )}
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                    <div>
                        <dt className="text-xs text-muted-foreground">{t(`collections.duePeriod.${period}`)}</dt>
                        <dd className="text-lg font-semibold tabular-nums">{formatCurrency(Math.max(0, duePeriod.amount - duePeriod.paid))}</dd>
                        <dd className="text-xs text-muted-foreground">{t("collections.installments", {count: duePeriod.installments})}</dd>
                    </div>
                    <div>
                        <dt className="text-xs text-muted-foreground">{t("collections.overdue")}</dt>
                        <dd className={`text-lg font-semibold tabular-nums ${overdue.deals > 0 ? "text-destructive" : ""}`}>
                            {formatCurrency(overdue.amount)}
                        </dd>
                        <dd className="text-xs text-muted-foreground">
                            {overdue.deals > 0 ? (
                                <Link to={paths.deals.attention("overdue_payments")} className="hover:underline">
                                    {t("collections.overdueDeals", {count: overdue.deals})}
                                </Link>
                            ) : t("collections.noOverdue")}
                        </dd>
                    </div>
                    <div className="col-span-2">
                        <dt className="text-xs text-muted-foreground">{t("collections.outstanding")}</dt>
                        <dd className="text-lg font-semibold tabular-nums">{formatCurrency(outstanding)}</dd>
                    </div>
                </dl>
            </CardContent>
        </Card>
    );
}
