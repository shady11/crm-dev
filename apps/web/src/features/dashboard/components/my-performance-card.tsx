import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import type {MyPerformance} from "@/features/dashboard/api/dashboard.api.ts";
import {useTranslation} from "react-i18next";

// SM-D1: a SALES_MANAGER's own deal count and conversion rate over a period —
// deliberately self-scoped, no visibility into teammates, so it stays a
// personal motivator rather than an informal leaderboard.
export function MyPerformanceCard({data}: {data: MyPerformance}) {
    const {t} = useTranslation("dashboard");

    return (
        <Card className="border border-secondary shadow-none pt-0">
            <CardHeader className="border-b py-4">
                <CardTitle className="text-sm text-muted-foreground">
                    {t("myPerformance.title", {days: data.periodDays})}
                </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4 text-center">
                <div>
                    <p className="text-2xl font-semibold">{data.leadsAssigned}</p>
                    <p className="text-xs text-muted-foreground">{t("myPerformance.leadsAssigned")}</p>
                </div>
                <div>
                    <p className="text-2xl font-semibold">{data.dealsWon}</p>
                    <p className="text-xs text-muted-foreground">{t("myPerformance.dealsWon")}</p>
                </div>
                <div>
                    <p className="text-2xl font-semibold">{Math.round(data.conversionRate * 100)}%</p>
                    <p className="text-xs text-muted-foreground">{t("myPerformance.conversionRate")}</p>
                </div>
            </CardContent>
        </Card>
    );
}
