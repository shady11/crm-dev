import {Bar, BarChart, CartesianGrid, XAxis, YAxis} from "recharts";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {type ChartConfig, ChartContainer, ChartGradient, ChartTooltip, ChartTooltipContent} from "@/components/ui/chart.tsx";
import type {RevenueTrendPoint} from "@/features/dashboard/api/dashboard.api.ts";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";
import {useTranslation} from "react-i18next";

function formatMonth(key: string, locale: string) {
    const [year, month] = key.split("-");
    return new Date(Number(year), Number(month) - 1).toLocaleDateString(locale, {month: "short"});
}

// What was sold (contracts signed, at sale price) next to the cash that
// came in, month by month: on installment plans the two drift apart, and
// the gap is the receivables still to collect.
export function SalesTrendChart({data}: {data: RevenueTrendPoint[]}) {
    const {t, i18n} = useTranslation("dashboard");
    const {formatCurrency} = useCompanyFormatters();
    const compact = new Intl.NumberFormat(i18n.language, {notation: "compact", maximumFractionDigits: 1});

    const chartConfig = {
        salesVolume: {label: t("salesTrend.salesVolume"), color: "var(--chart-1)"},
        revenue: {label: t("salesTrend.cashCollected"), color: "var(--chart-2)"},
    } satisfies ChartConfig;

    const chartData = data.map((d) => ({
        month: formatMonth(d.month, i18n.language),
        salesVolume: d.salesVolume ?? 0,
        revenue: d.revenue,
    }));

    return (
        <Card className="h-full border">
            <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">{t("salesTrend.title")}</CardTitle>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="h-64 w-full">
                    <BarChart data={chartData} barGap={4}>
                        <defs>
                            <ChartGradient id="fill-sales-volume" color="var(--color-salesVolume)" />
                            <ChartGradient id="fill-sales-cash" color="var(--color-revenue)" />
                        </defs>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                        <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(value: number) => compact.format(value)} />
                        <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
                        <Bar dataKey="salesVolume" fill="url(#fill-sales-volume)" radius={[3, 3, 1, 1]} maxBarSize={32} />
                        <Bar dataKey="revenue" fill="url(#fill-sales-cash)" radius={[3, 3, 1, 1]} maxBarSize={32} />
                    </BarChart>
                </ChartContainer>
                <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
                    {(["salesVolume", "revenue"] as const).map((key) => (
                        <div key={key} className="flex items-center gap-1.5">
                            <span className="size-2.5 rounded-[3px]" style={{backgroundColor: chartConfig[key].color}} />
                            {chartConfig[key].label}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
