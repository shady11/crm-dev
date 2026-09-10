import {useState} from "react";
import {Download, Loader2} from "lucide-react";
import {Bar, BarChart, CartesianGrid, XAxis} from "recharts";
import {Card, CardAction, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {Button} from "@/components/ui/button.tsx";
import {type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent} from "@/components/ui/chart.tsx";
import {toast} from "@/components/ui/toast.tsx";
import {downloadFunnelExport, type Funnel} from "@/features/dashboard/api/dashboard.api.ts";
import {useTranslation} from "react-i18next";

function percent(value: number) {
    return `${(value * 100).toFixed(1)}%`;
}

export function FunnelCard({
    data,
    projectId,
    branchId,
}: {
    data: Funnel;
    projectId?: string;
    branchId?: string;
}) {
    const { t } = useTranslation("dashboard");
    const [isExporting, setIsExporting] = useState(false);

    const chartConfig = {
        count: { label: t("funnel.leadsSeriesLabel"), color: "#3b82f6" },
    } satisfies ChartConfig;

    const chartData = data.leadsByStatus.map((row) => ({ status: row.status, count: row.count }));

    const handleExport = async () => {
        setIsExporting(true);
        try {
            await downloadFunnelExport(projectId, branchId);
        } catch {
            toast.error({ title: t("funnel.exportError") });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Card className="border border-secondary shadow-none">
            <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">{t("funnel.title")}</CardTitle>
                <CardAction>
                    <Button variant="secondary" size="sm" onClick={handleExport} disabled={isExporting}>
                        {isExporting ? <Loader2 className="animate-spin" /> : <Download />}
                        {t("funnel.export")}
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div>
                        <p className="text-xs text-muted-foreground">{t("funnel.totalLeads")}</p>
                        <p className="text-lg font-medium tabular-nums">{data.totalLeads}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">{t("funnel.totalDeals")}</p>
                        <p className="text-lg font-medium tabular-nums">{data.totalDeals}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">{t("funnel.leadToDeal")}</p>
                        <p className="text-lg font-medium tabular-nums">{percent(data.leadToDealConversionRate)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">{t("funnel.leadToWon")}</p>
                        <p className="text-lg font-medium tabular-nums">{percent(data.leadToWonConversionRate)}</p>
                    </div>
                </div>
                <ChartContainer config={chartConfig} className="h-56 w-full">
                    <BarChart data={chartData}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="status" tickLine={false} axisLine={false} tickMargin={8} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
