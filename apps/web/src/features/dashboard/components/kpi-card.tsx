import type {LucideIcon} from "lucide-react";
import {Card, CardContent} from "@/components/ui/card.tsx";

interface KpiCardProps {
    icon: LucideIcon;
    label: string;
    value: string;
    accent: string;
    subtext?: string;
}

export function KpiCard({ icon: Icon, label, value, accent, subtext }: KpiCardProps) {
    return (
        <Card className="border border-secondary shadow-none">
            <CardContent className="flex items-center gap-4">
                <div className={`flex size-11 shrink-0 items-center justify-center rounded-lg text-white ${accent}`}>
                    <Icon size={22} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="text-2xl font-semibold">{value}</p>
                    {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
                </div>
            </CardContent>
        </Card>
    );
}