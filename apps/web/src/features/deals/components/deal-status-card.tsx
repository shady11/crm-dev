import {CheckCircle2Icon} from "lucide-react";
import {Link} from "react-router-dom";
import {Card, CardContent} from "@/components/ui/card.tsx";
import {DEAL_STATUS_LABEL_KEYS, DEAL_STATUS_VISUALS, type DealStatus} from "@/features/deals/types/deal.types";
import {useTranslation} from "react-i18next";

interface DealStatusCardProps {
    status: DealStatus;
    count: number;
    /** Opens the deals at this stage (the dashboard). */
    to?: string;
    /** Filters the list on the same page instead (the Deals page). */
    onSelect?(): void;
    selected?: boolean;
}

export function DealStatusCard({ status, count, to, onSelect, selected }: DealStatusCardProps) {
    const { t } = useTranslation("deals");

    const visual = DEAL_STATUS_VISUALS[status];
    const Icon = visual?.icon ?? CheckCircle2Icon;

    const interactive = Boolean(to || onSelect);
    const label = t(DEAL_STATUS_LABEL_KEYS[status]);
    // Same shape as the dashboard's KPI tiles: icon, stage name, then the
    // number large, so a row of stages reads at a glance.
    const card = (
        <Card className={`h-full border shadow-none ${selected ? "border-primary ring-1 ring-primary" : "border-secondary"} ${interactive ? "transition-colors hover:bg-secondary/40" : ""}`}>
            <CardContent className="flex min-w-0 items-center gap-4">
                {/* Hidden on a phone, where two cards share a row and the label needs the room. */}
                <div className={`hidden size-11 shrink-0 items-center justify-center rounded-lg text-white sm:flex ${visual?.bg}`}>
                    <Icon size={22} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                    <p className="line-clamp-2 text-sm text-muted-foreground" title={label}>{label}</p>
                    <p className="text-2xl font-semibold tabular-nums">{count}</p>
                </div>
            </CardContent>
        </Card>
    );

    const focusRing = "block w-full rounded-xl text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";
    if (to) return <Link to={to} className={focusRing}>{card}</Link>;
    if (onSelect) return <button type="button" aria-pressed={selected} onClick={onSelect} className={focusRing}>{card}</button>;
    return card;
}