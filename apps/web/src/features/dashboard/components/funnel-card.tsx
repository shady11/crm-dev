import {useState} from "react";
import {Download, Loader2} from "lucide-react";
import {Bar, BarChart, CartesianGrid, LabelList, XAxis} from "recharts";
import {createListCollection} from "@ark-ui/react";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {Card, CardAction, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {Button} from "@/components/ui/button.tsx";
import {type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent} from "@/components/ui/chart.tsx";
import {toast} from "@/components/ui/toast.tsx";
import {downloadFunnelExport, type Funnel} from "@/features/dashboard/api/dashboard.api.ts";
import {useTranslation} from "react-i18next";
import {LEAD_STATUS_LABEL_KEYS, type LeadStatus} from "@/features/leads/types/lead.types.ts";

function percent(value: number) {
    return `${(value * 100).toFixed(1)}%`;
}

export function FunnelCard({
    data,
    projectId,
    branchId,
    managerId,
    managers,
    onManagerChange,
}: {
    data: Funnel;
    projectId?: string;
    branchId?: string;
    managerId?: string;
    /** Who the funnel can be split by; omitted for a viewer who only sees their own. */
    managers?: { id: string; fullName: string }[];
    onManagerChange?(managerId: string | undefined): void;
}) {
    const { t } = useTranslation("dashboard");
    const [isExporting, setIsExporting] = useState(false);

    const chartConfig = {
        count: { label: t("funnel.leadsSeriesLabel"), color: "var(--chart-1)" },
    } satisfies ChartConfig;

    // Axis labels in the reader's language rather than the raw status codes.
    const chartData = data.leadsByStatus.map((row) => ({
        status: t(LEAD_STATUS_LABEL_KEYS[row.status as LeadStatus] ?? row.status),
        count: row.count,
    }));

    const handleExport = async () => {
        setIsExporting(true);
        try {
            await downloadFunnelExport(projectId, branchId, managerId);
        } catch {
            toast.error({ title: t("funnel.exportError") });
        } finally {
            setIsExporting(false);
        }
    };

    const managerCollection = createListCollection({
        items: [{ label: t("funnel.allManagers"), value: "all" }, ...(managers ?? []).map((m) => ({ label: m.fullName, value: m.id }))],
    });

    return (
        <Card className="border border-secondary shadow-none">
            <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">{t("funnel.title")}</CardTitle>
                <CardAction className="flex flex-wrap items-center justify-end gap-2">
                    {managers && onManagerChange ? (
                        <Select
                            collection={managerCollection}
                            value={[managerId ?? "all"]}
                            onValueChange={({ value }) => onManagerChange(value[0] === "all" ? undefined : value[0])}
                        >
                            <SelectTrigger size="sm" className="w-44"><SelectValue placeholder={t("funnel.allManagers")} /></SelectTrigger>
                            <SelectContent>
                                {managerCollection.items.map((item) => <SelectItem key={item.value} item={item}>{item.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    ) : null}
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
                    <BarChart data={chartData} margin={{ top: 20 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="status" tickLine={false} axisLine={false} tickMargin={8} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" fill="var(--color-count)" radius={4}>
                            <LabelList dataKey="count" position="top" className="fill-foreground" fontSize={12} />
                        </Bar>
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
