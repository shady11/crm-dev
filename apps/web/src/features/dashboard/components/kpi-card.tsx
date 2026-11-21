import type {LucideIcon} from "lucide-react";
import {Link} from "react-router-dom";
import {Card, CardContent} from "@/components/ui/card.tsx";

interface KpiCardProps {
    icon: LucideIcon;
    label: string;
    value: string;
    accent: string;
    subtext?: string;
    /** Where the number leads, e.g. the list it counts. */
    to?: string;
}

export function KpiCard({ icon: Icon, label, value, accent, subtext, to }: KpiCardProps) {
    const card = (
        <Card className={`h-full border ${to ? "transition-colors hover:bg-secondary/40" : ""}`}>
            <CardContent className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="mt-1.5 text-3xl font-semibold tracking-tight">{value}</p>
                    {subtext && <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>}
                </div>
                <div className={`icon-tile flex size-7 shrink-0 items-center justify-center ${accent}`}>
                    <Icon size={16} strokeWidth={2} />
                </div>
            </CardContent>
        </Card>
    );

    return to ? <Link to={to} className="block rounded-2xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">{card}</Link> : card;
}