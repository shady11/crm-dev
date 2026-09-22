import {Bar, BarChart, CartesianGrid, XAxis, YAxis} from "recharts";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent} from "@/components/ui/chart.tsx";
import type {FinanceOverview} from "@/features/dashboard/api/dashboard.api.ts";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";
import {useTranslation} from "react-i18next";

// FIN-A1: a FINANCE user's collections overview — cash collected this
// month, what's overdue, what's coming due in the next 30 days, the
// outstanding balance across every deal still being paid off, and a
// cash-flow breakdown by payment method. FINANCE only.
export function FinanceOverviewCard({data}: {data: FinanceOverview}) {
    const {t} = useTranslation("dashboard");
    const {formatCurrency} = useCompanyFormatters();

    const chartConfig = {
        amount: {label: t("financeOverview.cashFlowLabel"), color: "var(--chart-1)"},
    } satisfies ChartConfig;

    const chartData = data.cashFlowByMethod
        .filter((row) => row.amount > 0)
        .map((row) => ({name: t(`financeOverview.method.${row.method}`, {defaultValue: row.method}), amount: row.amount}));

    return (
        <Card className="border border-secondary shadow-none pt-0">
            <CardHeader className="border-b py-4">
                <CardTitle className="text-sm text-muted-foreground">{t("financeOverview.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div>
                        <p className="text-xs text-muted-foreground">{t("financeOverview.collectedThisMonth")}</p>
                        <p className="text-xl font-semibold">{formatCurrency(data.collectedThisMonth)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">{t("financeOverview.outstandingBalance")}</p>
                        <p className="text-xl font-semibold">{formatCurrency(data.outstandingBalance)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">{t("financeOverview.overdue")}</p>
                        <p className={`text-xl font-semibold ${data.overdue.count > 0 ? "text-rose-600" : ""}`}>
                            {formatCurrency(data.overdue.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">{t("financeOverview.overdueCount", {count: data.overdue.count})}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">{t("financeOverview.upcoming")}</p>
                        <p className="text-xl font-semibold">{formatCurrency(data.upcoming.amount)}</p>
                        <p className="text-xs text-muted-foreground">{t("financeOverview.upcomingCount", {count: data.upcoming.count})}</p>
                    </div>
                </div>

                <div>
                    <h4 className="mb-2 text-xs font-medium text-muted-foreground">{t("financeOverview.cashFlowTitle")}</h4>
                    {chartData.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">{t("financeOverview.empty")}</p>
                    ) : (
                        <ChartContainer config={chartConfig} className="h-56 w-full">
                            <BarChart data={chartData}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                                <YAxis tickLine={false} axisLine={false} />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="amount" fill="var(--color-amount)" radius={4} />
                            </BarChart>
                        </ChartContainer>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
