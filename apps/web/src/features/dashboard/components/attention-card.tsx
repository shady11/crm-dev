import type {ReactNode} from "react";
import {Link} from "react-router-dom";
import {AlertTriangleIcon, BadgePercentIcon, ClockIcon, PhoneMissedIcon, TagIcon, WalletIcon} from "lucide-react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {paths} from "@/routes/paths.ts";
import type {AttentionItems} from "@/features/dashboard/api/dashboard.api.ts";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";
import {useTranslation} from "react-i18next";
import {priceChangePercent} from "@/features/units/api/unit-price-requests.api.ts";

function daysUntil(iso: string) {
    return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function daysSince(iso: string) {
    return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24)));
}

const ROW_CLASS = "flex items-center gap-3 rounded-md px-2 py-2.5 text-sm hover:bg-secondary/40";

function Section({title, viewAll, children}: {title: string; viewAll?: {to: string; label: string}; children: ReactNode}) {
    return (
        <section className="min-w-0 space-y-1">
            <div className="flex items-baseline justify-between gap-2 px-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase">{title}</h4>
                {viewAll ? (
                    <Link to={viewAll.to} className="shrink-0 text-xs font-medium text-primary hover:underline">{viewAll.label}</Link>
                ) : null}
            </div>
            <div className="flex flex-col">{children}</div>
        </section>
    );
}

/**
 * The dashboard's inbox: discounts waiting on a decision, overdue
 * installments, reservations about to lapse and tasks coming due. Every row
 * opens the record it's about. `showOwner` adds whose deal or task it is,
 * for a viewer looking at a whole branch rather than their own work.
 */
export function AttentionCard({data, showOwner}: {data: AttentionItems; showOwner: boolean}) {
    const {t} = useTranslation("dashboard");
    const {formatCurrency, formatDate} = useCompanyFormatters();
    const {pendingApprovals, overduePayments, expiringDeals, urgentTasks, overdueFollowUps} = data;
    const priceChanges = data.pendingPriceChanges ?? {total: 0, requests: []};
    const hasNothing = pendingApprovals.deals.length === 0
        && priceChanges.requests.length === 0
        && overdueFollowUps.leads.length === 0
        && overduePayments.deals.length === 0
        && expiringDeals.length === 0
        && urgentTasks.length === 0;

    const owner = (name: string | undefined) => (showOwner && name ? `${name} · ` : "");

    return (
        <Card className="border border-secondary shadow-none pt-0">
            <CardHeader className="border-b py-4">
                <CardTitle className="text-sm text-muted-foreground">{t("attention.title")}</CardTitle>
            </CardHeader>
            <CardContent className="@container">
                {hasNothing ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">{t("attention.empty")}</p>
                ) : (
                    <div className="grid gap-x-6 gap-y-4 @2xl:grid-cols-2">
                        {pendingApprovals.deals.length > 0 ? (
                            <Section
                                title={t("attention.approvalsHeading", {count: pendingApprovals.total})}
                                viewAll={pendingApprovals.total > pendingApprovals.deals.length
                                    ? {to: paths.deals.attention("discount_pending"), label: t("attention.viewAll")}
                                    : undefined}
                            >
                                {/* Ones the viewer can decide first; each group stays oldest first. */}
                                {[...pendingApprovals.deals].sort((x, y) => Number(!!x.aboveYourLimit) - Number(!!y.aboveYourLimit)).map((deal) => {
                                    const waitingDays = deal.reservedAt ? daysSince(deal.reservedAt) : 0;
                                    return (
                                        <Link key={deal.id} to={paths.deals.detail(deal.id)} className={ROW_CLASS}>
                                            <BadgePercentIcon size={16} className={`shrink-0 ${deal.aboveYourLimit ? "text-muted-foreground" : waitingDays >= 1 ? "text-destructive" : "text-amber-500"}`} />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-medium">{deal.dealNumber} · {deal.client.fullName}</p>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {owner(deal.manager?.fullName)}
                                                    {t("attention.discountRequested", {
                                                        percent: deal.requestedDiscountPercent ?? 0,
                                                        amount: formatCurrency(deal.requestedDiscountAmount ?? 0),
                                                    })}
                                                    {" · "}
                                                    {waitingDays === 0 ? t("attention.waitingToday") : t("attention.waitingDays", {count: waitingDays})}
                                                    {deal.aboveYourLimit ? ` · ${t("attention.aboveYourLimit")}` : null}
                                                </p>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </Section>
                        ) : null}

                        {priceChanges.requests.length > 0 ? (
                            <Section
                                title={t("attention.priceChangesHeading", {count: priceChanges.total})}
                                viewAll={{to: paths.priceChanges, label: t("attention.review")}}
                            >
                                {priceChanges.requests.map((r) => {
                                    const pct = priceChangePercent(r.currentPrice, r.requestedPrice);
                                    return (
                                        <Link key={r.id} to={paths.priceChanges} className={ROW_CLASS}>
                                            <TagIcon size={16} className={`shrink-0 ${pct < 0 ? "text-destructive" : "text-amber-500"}`} />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-medium">{t("attention.priceChangeUnit", {unit: r.unit.number, project: r.unit.project.name})}</p>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {r.requestedBy ? `${r.requestedBy.fullName} · ` : ""}
                                                    {formatCurrency(r.currentPrice)} → {formatCurrency(r.requestedPrice)} ({pct > 0 ? "+" : ""}{pct}%)
                                                </p>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </Section>
                        ) : null}

                        {overduePayments.deals.length > 0 ? (
                            <Section
                                title={t("attention.overdueHeading", {
                                    count: overduePayments.installments,
                                    amount: formatCurrency(overduePayments.amount),
                                })}
                                viewAll={{to: paths.deals.attention("overdue_payments"), label: t("attention.viewAll")}}
                            >
                                {overduePayments.deals.map((deal) => (
                                    <Link key={deal.id} to={paths.deals.payments(deal.id)} className={ROW_CLASS}>
                                        <WalletIcon size={16} className="shrink-0 text-destructive" />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-medium">{deal.dealNumber} · {deal.client.fullName}</p>
                                            <p className="truncate text-xs text-muted-foreground">
                                                {owner(deal.manager?.fullName)}
                                                {t("attention.overdueInstallments", {count: deal.installments})}
                                                {" · "}
                                                {t("attention.overdueSince", {date: formatDate(deal.oldestDueDate)})}
                                            </p>
                                        </div>
                                        <p className="shrink-0 text-sm font-medium tabular-nums">{formatCurrency(deal.amount)}</p>
                                    </Link>
                                ))}
                            </Section>
                        ) : null}

                        {expiringDeals.length > 0 ? (
                            <Section title={t("attention.reservationsHeading")}>
                                {expiringDeals.map((deal) => {
                                    const days = daysUntil(deal.reservationExpiresAt);
                                    return (
                                        <Link key={deal.id} to={paths.deals.detail(deal.id)} className={ROW_CLASS}>
                                            <ClockIcon size={16} className={`shrink-0 ${days <= 1 ? "text-destructive" : "text-amber-500"}`} />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-medium">{deal.dealNumber} · {deal.client.fullName}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {days <= 0 ? t("attention.reservationExpired") : t("attention.reservationExpiresIn", {days})}
                                                </p>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </Section>
                        ) : null}

                        {overdueFollowUps.leads.length > 0 ? (
                            <Section
                                title={t("attention.followUpsHeading", {count: overdueFollowUps.total})}
                                viewAll={overdueFollowUps.total > overdueFollowUps.leads.length
                                    ? {to: paths.overdueFollowUps(), label: t("attention.viewAll")}
                                    : undefined}
                            >
                                {overdueFollowUps.leads.map((lead) => (
                                    <Link key={lead.id} to={paths.leadDetail(lead.id)} className={ROW_CLASS}>
                                        <PhoneMissedIcon size={16} className="shrink-0 text-destructive" />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-medium">{lead.fullName}</p>
                                            <p className="truncate text-xs text-muted-foreground">
                                                {owner(lead.manager?.fullName)}
                                                {t("attention.followUpDueSince", {date: formatDate(lead.nextContactAt)})}
                                            </p>
                                        </div>
                                    </Link>
                                ))}
                            </Section>
                        ) : null}

                        {urgentTasks.length > 0 ? (
                            <Section title={t("attention.tasksHeading")}>
                                {urgentTasks.map((task) => {
                                    const days = daysUntil(task.dueDate);
                                    return (
                                        <Link key={task.id} to={paths.tasks.root} className={ROW_CLASS}>
                                            <AlertTriangleIcon size={16} className={`shrink-0 ${days < 0 ? "text-destructive" : "text-amber-500"}`} />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-medium">{task.title}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {owner(task.assignedTo.fullName)}
                                                    {days < 0 ? t("attention.taskOverdue") : days === 0 ? t("attention.taskDueToday") : t("attention.taskDueIn", {days})}
                                                </p>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </Section>
                        ) : null}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
