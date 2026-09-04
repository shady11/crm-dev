import {Bar, BarChart, CartesianGrid, XAxis} from "recharts";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent} from "@/components/ui/chart.tsx";
import type {RevenueTrendPoint} from "@/features/dashboard/api/dashboard.api.ts";
import {useTranslation} from "react-i18next";

function formatMonth(key: string, locale: string) {
    const [year, month] = key.split("-");
    return new Date(Number(year), Number(month) - 1).toLocaleDateString(locale, { month: "short" });
}

export function RevenueTrendChart({ data }: { data: RevenueTrendPoint[] }) {
    const { t, i18n } = useTranslation("dashboard");

    const chartConfig = {
        revenue: { label: t("revenueTrend.seriesLabel"), color: "#3b82f6" },
    } satisfies ChartConfig;

    const chartData = data.map((d) => ({ month: formatMonth(d.month, i18n.language), revenue: d.revenue }));

    return (
        <Card className="border border-secondary shadow-none">
            <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">{t("revenueTrend.title")}</CardTitle>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="h-64 w-full">
                    <BarChart data={chartData}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}