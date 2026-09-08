import {Bar, BarChart, CartesianGrid, XAxis, YAxis} from "recharts";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent} from "@/components/ui/chart.tsx";
import type {BranchComparisonItem} from "@/features/dashboard/api/dashboard.api.ts";
import {useTranslation} from "react-i18next";

// BR-E1: "which office is doing well" — deal counts and revenue broken down
// by branch, for the COMPANY_ADMIN dashboard only.
export function BranchComparisonChart({data}: {data: BranchComparisonItem[]}) {
    const {t} = useTranslation("dashboard");

    const chartConfig = {
        dealCount: {label: t("branchComparison.dealCountLabel"), color: "#3b82f6"},
        revenue: {label: t("branchComparison.revenueLabel"), color: "#34d399"},
    } satisfies ChartConfig;

    const chartData = data.map((d) => ({name: d.branchName, dealCount: d.dealCount, revenue: d.revenue}));

    return (
        <Card className="border border-secondary shadow-none">
            <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">{t("branchComparison.title")}</CardTitle>
            </CardHeader>
            <CardContent>
                {chartData.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">{t("branchComparison.empty")}</p>
                ) : (
                    <ChartContainer config={chartConfig} className="h-64 w-full">
                        <BarChart data={chartData}>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                            <YAxis tickLine={false} axisLine={false} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="dealCount" fill="var(--color-dealCount)" radius={4} />
                            <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
                        </BarChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    );
}
