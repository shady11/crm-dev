import type {ReactNode} from "react";
import {Link} from "react-router-dom";
import {CircleAlertIcon, CircleCheckIcon, ExternalLinkIcon, MailIcon, PhoneIcon, RepeatIcon, UserRoundXIcon} from "lucide-react";
import {useTranslation} from "react-i18next";
import {Avatar, AvatarFallback} from "@/components/ui/avatar.tsx";
import {Badge} from "@/components/ui/badge.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {WhatsAppLink} from "@/components/shared/whatsapp-link.tsx";
import type {DealDetails} from "@/features/deals/api/deals.api.ts";
import {DealStatus, FINANCING_TYPE_LABEL_KEYS} from "@/features/deals/types/deal.types.ts";
import {UNIT_TYPE_LABEL_KEYS} from "@/features/units/types/unit.types.ts";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";
import {formatDate} from "@/utils/date-formatter.ts";
import {paths} from "@/routes/paths.ts";
import {useAuth} from "@/features/auth/hooks/use-auth.ts";
import {initials} from "@/features/deals/utils/format.ts";

interface DealDetailsSidebarProps {
    deal: DealDetails;
    canReassign: boolean;
    onReassign(): void;
}

function Section({title, action, children}: {title: string; action?: ReactNode; children: ReactNode}) {
    return (
        <section className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
            <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h3>
                {action}
            </div>
            {children}
        </section>
    );
}

function Row({label, children}: {label: string; children: ReactNode}) {
    return (
        <div className="flex items-baseline justify-between gap-4 text-sm">
            <dt className="shrink-0 text-muted-foreground">{label}</dt>
            <dd className="min-w-0 text-right font-medium break-words">{children}</dd>
        </div>
    );
}

/**
 * Everything about the deal that isn't money or history, in one card: who
 * the client is and how to reach them, who owns the deal, which unit it is,
 * and the deal's own facts. Replaces separate client, manager, unit, financials and timeline
 * cards that repeated the price and dates several times.
 */
export function DealDetailsSidebar({deal, canReassign, onReassign}: DealDetailsSidebarProps) {
    const {t, i18n} = useTranslation(["deals", "common", "units"]);
    const {formatCurrency} = useCompanyFormatters();
    const {user} = useAuth();
    const date = (iso: string | null | undefined) => (iso ? formatDate(iso, i18n.language).date : "—");

    const {client, unit, project, manager} = deal;
    const hasId = !!client.passport?.trim() && !!client.pin?.trim();
    const pricePerSqm = unit.area > 0 ? Math.round(deal.listPrice / unit.area) : null;
    const location = [
        project.name,
        unit.block && `${t("labels.block", {ns: "common"})} ${unit.block.name}`,
        unit.entrance && `${t("labels.entrance", {ns: "common"})} ${unit.entrance.name}`,
        unit.floor && t("unitCard.floor", {floor: unit.floor.number}),
    ].filter(Boolean).join(" · ");
    const shape = [
        t(UNIT_TYPE_LABEL_KEYS[unit.type]),
        unit.rooms != null && t("sidebar.rooms", {count: unit.rooms}),
        `${unit.area.toFixed(1)} ${t("units.sqm", {ns: "common"})}`,
    ].filter(Boolean).join(" · ");

    return (
        <Card className="border border-secondary pt-0 shadow-none">
            <CardHeader className="border-b py-4">
                <CardTitle>{t("sidebar.title")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col divide-y">
                <Section title={t("sidebar.client")}>
                    <div className="flex flex-col gap-1.5">
                        <Link to={paths.clients.detail(client.id)} className="font-semibold hover:underline">
                            {client.fullName}
                        </Link>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                            <a href={`tel:${client.phone}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                                <PhoneIcon size={14} />
                                {client.phone}
                            </a>
                            <WhatsAppLink phone={client.phone} />
                        </div>
                        {client.email && <p className="truncate text-sm text-muted-foreground">{client.email}</p>}
                    </div>
                    {/* A contract can't be signed without these, so say so before anyone tries. */}
                    {(deal.status === DealStatus.RESERVED || hasId) && (
                        <p className={`flex items-start gap-1.5 text-xs ${hasId ? "text-muted-foreground" : "text-warning-foreground"}`}>
                            {hasId ? <CircleCheckIcon className="mt-px size-3.5 shrink-0 text-success" /> : <CircleAlertIcon className="mt-px size-3.5 shrink-0 text-warning" />}
                            {hasId ? t("sidebar.idOnFile") : t("sidebar.idMissing")}
                        </p>
                    )}
                </Section>

                <Section
                    title={t("managerCard.title")}
                    action={
                        canReassign && (
                            <Button variant="ghost" size="xs" onClick={onReassign}>
                                <RepeatIcon className="size-3" />
                                {t("sidebar.reassign")}
                            </Button>
                        )
                    }
                >
                    {manager ? (
                        <div className="flex items-start gap-3">
                            <Avatar className="size-9">
                                <AvatarFallback className="text-xs">{initials(manager.fullName)}</AvatarFallback>
                            </Avatar>
                            <div className="flex min-w-0 flex-col gap-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <p className="font-semibold">{manager.fullName}</p>
                                    {manager.id === user?.id && <Badge variant="secondary">{t("sidebar.you")}</Badge>}
                                </div>
                                <p className="text-sm text-muted-foreground">{manager.role.name}</p>
                                {/* Your own number isn't much use to you; colleagues and heads need it. */}
                                {manager.id !== user?.id && (
                                    <div className="flex flex-col gap-1 text-sm">
                                        {manager.phone && (
                                            <a href={`tel:${manager.phone}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                                                <PhoneIcon size={14} />
                                                {manager.phone}
                                            </a>
                                        )}
                                        <a href={`mailto:${manager.email}`} className="flex min-w-0 items-center gap-1.5 text-muted-foreground hover:text-foreground">
                                            <MailIcon size={14} className="shrink-0" />
                                            <span className="truncate">{manager.email}</span>
                                        </a>
                                    </div>
                                )}
                                {!manager.isActive && (
                                    <p className="flex items-start gap-1.5 text-xs text-warning-foreground">
                                        <UserRoundXIcon className="mt-px size-3.5 shrink-0 text-warning" />
                                        {t("sidebar.managerInactive")}
                                    </p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <p className="flex items-start gap-1.5 text-sm text-warning-foreground">
                            <UserRoundXIcon className="mt-0.5 size-4 shrink-0 text-warning" />
                            {t("sidebar.noManager")}
                        </p>
                    )}
                </Section>

                <Section
                    title={t("sidebar.unit")}
                    action={
                        <Button variant="ghost" size="xs" asChild>
                            <a href={paths.units.infoSheet(unit.id)} target="_blank" rel="noopener noreferrer">
                                {t("sidebar.unitSheet")}
                                <ExternalLinkIcon className="size-3" />
                            </a>
                        </Button>
                    }
                >
                    <div className="flex flex-col gap-0.5">
                        <p className="font-semibold">{t("unitCard.unitNumber", {number: unit.number})}</p>
                        <p className="text-sm text-muted-foreground">{location}</p>
                        <p className="text-sm text-muted-foreground">{shape}</p>
                    </div>
                    <dl className="flex flex-col gap-1.5">
                        <Row label={t("financials.listPrice")}>{formatCurrency(deal.listPrice)}</Row>
                        {pricePerSqm != null && <Row label={t("financials.pricePerMeter")}>{formatCurrency(pricePerSqm)}/m²</Row>}
                    </dl>
                </Section>

                <Section title={t("sidebar.deal")}>
                    <dl className="flex flex-col gap-1.5">
                        {deal.financingType && <Row label={t("financials.financing")}>{t(FINANCING_TYPE_LABEL_KEYS[deal.financingType])}</Row>}
                        {(deal.discountPercent ?? 0) > 0 && (
                            <Row label={t("financials.discount")}>
                                {deal.discountPercent}%{deal.discountAmount != null && ` · ${formatCurrency(deal.discountAmount)}`}
                            </Row>
                        )}
                        <Row label={t("timelineCard.reserved")}>{date(deal.reservedAt)}</Row>
                        {deal.contractNumber && (
                            <Row label={t("timelineCard.contract")}>
                                № {deal.contractNumber}
                                {deal.contractDate && <span className="block font-normal text-muted-foreground">{date(deal.contractDate)}</span>}
                            </Row>
                        )}
                        {deal.status === DealStatus.CANCELLED && (
                            <Row label={t("timelineCard.cancelled")}>
                                {date(deal.cancelledAt)}
                                {deal.cancelReason && <span className="block font-normal text-muted-foreground">{deal.cancelReason}</span>}
                            </Row>
                        )}
                        <Row label={t("timelineCard.created")}>{date(deal.createdAt)}</Row>
                    </dl>
                    {deal.note && (
                        <div className="rounded-md bg-muted/60 p-3 text-sm">
                            <p className="mb-1 text-xs font-medium text-muted-foreground">{t("timelineCard.note")}</p>
                            <p className="whitespace-pre-line">{deal.note}</p>
                        </div>
                    )}
                </Section>
            </CardContent>
        </Card>
    );
}
