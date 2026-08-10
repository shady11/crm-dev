import {Cell, Pie, PieChart} from "recharts";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {ChartContainer, ChartTooltip, ChartTooltipContent} from "@/components/ui/chart.tsx";
import type {UnitsSummaryItem} from "@/features/dashboard/api/dashboard.api.ts";

const STATUS_COLORS: Record<string, string> = {
    AVAILABLE: "#34d399", RESERVED: "#fbbf24", SOLD: "#fb7185", UNAVAILABLE: "#9ca3af",
};
const STATUS_LABELS: Record<string, string> = {
    AVAILABLE: "Available", RESERVED: "Reserved", SOLD: "Sold", UNAVAILABLE: "Unavailable",
};

export function UnitsInventoryChart({ data }: { data: UnitsSummaryItem[] }) {
    const total = data.reduce((sum, d) => sum + d.count, 0);
    const chartData = data.map((d) => ({ name: STATUS_LABELS[d.status] ?? d.status, value: d.count, status: d.status }));

    return (
        <Card className="border border-secondary shadow-none">
            <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Unit inventory</CardTitle>
            </CardHeader>
            <CardContent>
                <ChartContainer config={{}} className="mx-auto h-56 w-full max-w-56">
                    <PieChart>
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} strokeWidth={2}>
                            {chartData.map((entry) => (
                                <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "#9ca3af"} />
                            ))}
                        </Pie>
                    </PieChart>
                </ChartContainer>
                <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
                    {chartData.map((entry) => (
                        <div key={entry.status} className="flex items-center gap-1.5">
                            <span className="size-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[entry.status] }} />
                            {entry.name} ({entry.value})
                        </div>
                    ))}
                </div>
                <p className="mt-2 text-center text-xs text-muted-foreground">{total} units total</p>
            </CardContent>
        </Card>
    );
}