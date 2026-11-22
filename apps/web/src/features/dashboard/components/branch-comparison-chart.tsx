import {Bar, BarChart, CartesianGrid, XAxis, YAxis} from "recharts";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {type ChartConfig, ChartContainer, ChartGradient, ChartTooltip, ChartTooltipContent} from "@/components/ui/chart.tsx";
import type {BranchComparisonItem} from "@/features/dashboard/api/dashboard.api.ts";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";
import {useTranslation} from "react-i18next";

// BR-E1: "which office is doing well" — deal counts and revenue broken down
// by branch, for the COMPANY_ADMIN dashboard only.
// Two charts side by side rather than one: a deal count (single digits) and
// revenue (hundreds of thousands) on a shared axis flattened the counts to
// nothing. Each measure gets its own scale.
export function BranchComparisonChart({data}: {data: BranchComparisonItem[]}) {
    const {t, i18n} = useTranslation("dashboard");
    const {formatCurrency} = useCompanyFormatters();
    const compact = new Intl.NumberFormat(i18n.language, {notation: "compact", maximumFractionDigits: 1});

    const dealConfig = {
        dealCount: {label: t("branchComparison.dealCountLabel"), color: "var(--chart-1)"},
    } satisfies ChartConfig;
    const revenueConfig = {
        revenue: {label: t("branchComparison.revenueLabel"), color: "var(--chart-1)"},
    } satisfies ChartConfig;

    const chartData = data.map((d) => ({name: d.branchName, dealCount: d.dealCount, revenue: d.revenue}));

    return (
        <Card className="border">
            <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">{t("branchComparison.title")}</CardTitle>
            </CardHeader>
            <CardContent>
                {chartData.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">{t("branchComparison.empty")}</p>
                ) : (
                    <div className="grid gap-8 md:grid-cols-2">
                        <div className="min-w-0">
                            <p className="mb-3 text-sm font-medium">{t("branchComparison.dealCountLabel")}</p>
                            <ChartContainer config={dealConfig} className="h-56 w-full">
                                <BarChart data={chartData}>
                                    <defs><ChartGradient id="fill-branch-deals" color="var(--color-dealCount)" /></defs>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                                    <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={32} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey="dealCount" fill="url(#fill-branch-deals)" radius={[3, 3, 1, 1]} maxBarSize={56} />
                                </BarChart>
                            </ChartContainer>
                        </div>
                        <div className="min-w-0">
                            <p className="mb-3 text-sm font-medium">{t("branchComparison.revenueLabel")}</p>
                            <ChartContainer config={revenueConfig} className="h-56 w-full">
                                <BarChart data={chartData}>
                                    <defs><ChartGradient id="fill-branch-revenue" color="var(--color-revenue)" /></defs>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                                    <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={(value: number) => compact.format(value)} />
                                    <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
                                    <Bar dataKey="revenue" fill="url(#fill-branch-revenue)" radius={[3, 3, 1, 1]} maxBarSize={56} />
                                </BarChart>
                            </ChartContainer>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
