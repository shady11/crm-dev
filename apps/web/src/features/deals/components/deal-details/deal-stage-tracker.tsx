import {CheckIcon, XIcon} from "lucide-react";
import {useTranslation} from "react-i18next";
import {cn} from "@/lib/utils";
import type {DealDetails} from "@/features/deals/api/deals.api.ts";
import {DEAL_STATUS_LABEL_KEYS, DealStatus} from "@/features/deals/types/deal.types.ts";
import {formatDate} from "@/utils/date-formatter.ts";

const STAGES = [DealStatus.RESERVED, DealStatus.CONTRACT_SIGNED, DealStatus.ACTIVE, DealStatus.COMPLETED] as const;

/**
 * How far a deal got before it was cancelled or expired. There is no
 * activation date on the deal, so a generated payment schedule stands in
 * for "it was activated".
 */
function reachedStage(deal: DealDetails): number {
    const index = STAGES.indexOf(deal.status as (typeof STAGES)[number]);
    if (index >= 0) return index;
    if (deal.paymentSchedules.length > 0) return 2;
    if (deal.contractDate) return 1;
    return 0;
}

/**
 * The deal's place in its lifecycle (reserved → contract → payments →
 * completed), each step with the date or detail that matters for it. A
 * cancelled or expired deal ends in a terminal step at the point it stopped.
 */
export function DealStageTracker({deal}: {deal: DealDetails}) {
    const {t, i18n} = useTranslation("deals");
    const date = (iso: string | null | undefined) => (iso ? formatDate(iso, i18n.language).date : null);

    const terminated = deal.status === DealStatus.CANCELLED || deal.status === DealStatus.EXPIRED;
    const reached = reachedStage(deal);

    const detail: Record<(typeof STAGES)[number], string | null> = {
        RESERVED: date(deal.reservedAt),
        CONTRACT_SIGNED: deal.contractNumber
            ? [`№ ${deal.contractNumber}`, date(deal.contractDate)].filter(Boolean).join(" · ")
            : null,
        ACTIVE: deal.paymentSchedules.length > 0
            ? t("stage.installments", {count: deal.paymentSchedules.length})
            : null,
        COMPLETED: null,
    };

    // A terminated deal shows the stages it reached, then where it stopped.
    const steps = terminated ? STAGES.slice(0, reached + 1) : STAGES;

    return (
        <ol className="grid auto-cols-fr grid-flow-col gap-1.5 sm:gap-2" aria-label={t("stage.label")}>
            {steps.map((stage, index) => {
                const done = terminated || index < reached;
                const current = !terminated && index === reached;
                return (
                    <li key={stage} className="flex min-w-0 flex-col gap-2" aria-current={current ? "step" : undefined}>
                        <div
                            className={cn(
                                "h-1.5 rounded-full",
                                done || current ? "bg-primary" : "bg-muted",
                                current && deal.status !== DealStatus.COMPLETED && "bg-primary/60",
                            )}
                        />
                        <div className="flex min-w-0 items-start gap-1.5">
                            {(done || (current && deal.status === DealStatus.COMPLETED)) && (
                                <CheckIcon className="mt-0.5 hidden size-3.5 shrink-0 text-primary sm:block" />
                            )}
                            <div className="min-w-0">
                                <p className={cn("text-xs sm:text-sm", current ? "font-semibold" : done ? "font-medium" : "text-muted-foreground")}>
                                    {t(DEAL_STATUS_LABEL_KEYS[stage])}
                                </p>
                                {detail[stage] && (done || current) && (
                                    <p className="hidden truncate text-xs text-muted-foreground sm:block">{detail[stage]}</p>
                                )}
                            </div>
                        </div>
                    </li>
                );
            })}
            {terminated && (
                <li className="flex min-w-0 flex-col gap-2" aria-current="step">
                    <div className="h-1.5 rounded-full bg-destructive" />
                    <div className="flex min-w-0 items-start gap-1.5">
                        <XIcon className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-destructive sm:text-sm">{t(DEAL_STATUS_LABEL_KEYS[deal.status])}</p>
                            <p className="hidden truncate text-xs text-muted-foreground sm:block">
                                {deal.status === DealStatus.CANCELLED ? date(deal.cancelledAt) : date(deal.reservationExpiresAt)}
                            </p>
                        </div>
                    </div>
                </li>
            )}
        </ol>
    );
}
