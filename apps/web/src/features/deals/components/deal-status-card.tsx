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
    const card = (
        <Card className={`h-full border shadow-none ${selected ? "border-primary" : "border-secondary"} ${interactive ? "transition-colors hover:bg-secondary/40" : ""}`}>
            <CardContent className="flex min-w-0 items-center gap-3">
                {/* Hidden on a phone, where two cards share a row and the label needs the room. */}
                <div className={`hidden shrink-0 rounded-lg p-2 text-white sm:block ${visual?.bg}`}>
                    <Icon size={20} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                    <h3 className="font-medium">{t(DEAL_STATUS_LABEL_KEYS[status])}</h3>
                    <p className="text-sm text-muted-foreground">
                        {t("statusCard.count", { count })}
                    </p>
                </div>
            </CardContent>
        </Card>
    );

    const focusRing = "block w-full rounded-xl text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";
    if (to) return <Link to={to} className={focusRing}>{card}</Link>;
    if (onSelect) return <button type="button" aria-pressed={selected} onClick={onSelect} className={focusRing}>{card}</button>;
    return card;
}