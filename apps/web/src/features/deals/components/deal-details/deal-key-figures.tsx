import type {ReactNode} from "react";
import {useTranslation} from "react-i18next";
import {cn} from "@/lib/utils";
import {Card, CardContent} from "@/components/ui/card.tsx";
import {Progress} from "@/components/ui/progress";
import type {DealDetails} from "@/features/deals/api/deals.api.ts";
import {DealStatus} from "@/features/deals/types/deal.types.ts";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";
import {daysUntil} from "@/features/deals/utils/days-until.ts";
import {formatDate} from "@/utils/date-formatter.ts";

interface DealKeyFiguresProps {
    deal: DealDetails;
    totalPaid: number;
    remaining: number;
}

function Figure({label, value, children, tone}: {label: string; value: ReactNode; children?: ReactNode; tone?: "danger"}) {
    return (
        <Card className="border border-secondary py-4 shadow-none">
            <CardContent className="flex min-w-0 flex-col gap-1 px-4">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
                {/* Wraps rather than truncates: a cut-off amount is worse than a taller tile. */}
                <p className={cn("text-lg leading-tight font-semibold tabular-nums break-words sm:text-xl", tone === "danger" && "text-destructive")}>{value}</p>
                {children && <div className="text-xs text-muted-foreground">{children}</div>}
            </CardContent>
        </Card>
    );
}

/**
 * The four numbers a manager checks first, in one row: what the client
 * pays, how much is in, what's left, and the next thing that is due, which
 * depends on the deal's stage.
 */
export function DealKeyFigures({deal, totalPaid, remaining}: DealKeyFiguresProps) {
    const {t, i18n} = useTranslation("deals");
    const {formatCurrency} = useCompanyFormatters();
    const date = (iso: string) => formatDate(iso, i18n.language).date;

    const paidPercent = deal.salePrice > 0 ? Math.min(100, Math.round((totalPaid / deal.salePrice) * 100)) : 0;
    const hasDiscount = (deal.discountPercent ?? 0) > 0;
    const terminated = deal.status === DealStatus.CANCELLED || deal.status === DealStatus.EXPIRED;

    return (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Figure label={t("financials.salePrice")} value={formatCurrency(deal.salePrice)}>
                {hasDiscount
                    ? t("keyFigures.discounted", {list: formatCurrency(deal.listPrice), percent: deal.discountPercent})
                    : t("keyFigures.atListPrice")}
            </Figure>

            <Figure label={t("financials.paid")} value={formatCurrency(totalPaid)}>
                <div className="flex items-center gap-2">
                    <Progress className="h-1 flex-1" value={paidPercent} aria-label={t("keyFigures.paidShare", {percent: paidPercent})} />
                    <span className="tabular-nums">{paidPercent}%</span>
                </div>
            </Figure>

            {/* Nothing is owed on a deal that has ended without a sale. */}
            <Figure label={t("financials.remaining")} value={terminated ? "—" : formatCurrency(remaining)}>
                {terminated ? null : t("keyFigures.ofSalePrice", {total: formatCurrency(deal.salePrice)})}
            </Figure>

            <NextUp deal={deal} date={date} formatCurrency={formatCurrency} />
        </div>
    );
}

function NextUp({deal, date, formatCurrency}: {deal: DealDetails; date(iso: string): string; formatCurrency(n: number): string}) {
    const {t} = useTranslation("deals");

    switch (deal.status) {
        case DealStatus.RESERVED: {
            if (!deal.reservationExpiresAt) return <Figure label={t("keyFigures.reservationExpires")} value="—" />;
            const days = daysUntil(deal.reservationExpiresAt) ?? 0;
            return (
                <Figure label={t("keyFigures.reservationExpires")} value={date(deal.reservationExpiresAt)} tone={days <= 1 ? "danger" : undefined}>
                    {days > 0 ? t("card.daysLeft", {count: days}) : days === 0 ? t("card.expiresToday") : t("card.expired")}
                </Figure>
            );
        }
        case DealStatus.CONTRACT_SIGNED:
            return (
                <Figure label={t("keyFigures.contract")} value={deal.contractNumber ? `№ ${deal.contractNumber}` : "—"}>
                    {t("keyFigures.activateHint")}
                </Figure>
            );
        case DealStatus.ACTIVE: {
            const next = deal.paymentSchedules.find((s) => s.status !== "PAID");
            if (!next) return <Figure label={t("keyFigures.nextPayment")} value="—">{t("keyFigures.noSchedule")}</Figure>;
            const overdue = next.status === "OVERDUE" || (daysUntil(next.dueDate) ?? 0) < 0;
            return (
                <Figure label={t("keyFigures.nextPayment")} value={formatCurrency(next.amount - next.paidAmount)} tone={overdue ? "danger" : undefined}>
                    {overdue ? t("keyFigures.overdueSince", {date: date(next.dueDate)}) : t("keyFigures.dueOn", {date: date(next.dueDate)})}
                </Figure>
            );
        }
        case DealStatus.COMPLETED:
            return <Figure label={t("keyFigures.status")} value={t("keyFigures.fullyPaid")} />;
        case DealStatus.CANCELLED:
            return (
                <Figure label={t("keyFigures.status")} value={t("status.cancelled")} tone="danger">
                    {deal.cancelReason ?? (deal.cancelledAt ? date(deal.cancelledAt) : null)}
                </Figure>
            );
        default:
            return (
                <Figure label={t("keyFigures.status")} value={t("status.expired")} tone="danger">
                    {deal.reservationExpiresAt ? date(deal.reservationExpiresAt) : null}
                </Figure>
            );
    }
}
