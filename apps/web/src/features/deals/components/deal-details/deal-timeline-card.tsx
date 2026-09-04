import {Card, CardContent, CardHeader} from "@/components/ui/card.tsx";
import {DataList, DataListItem, DataListItemLabel, DataListItemValue} from "@/components/ui/data-list.tsx";
import type {Deal} from "@/features/deals/api/deals.api.ts";
import {formatDate} from "@/utils/date-formatter.ts";
import {useTranslation} from "react-i18next";

export function     DealTimelineCard({ deal }: { deal: Deal }) {
    const { t, i18n } = useTranslation("deals");

    return (
        <Card className="border border-secondary shadow-none flex-1">
            <CardHeader title={t("timelineCard.title")} className="py-4 border-b gap-0"></CardHeader>
            <CardContent>
                <DataList className="divide-y">
                    <DataListItem>
                        <DataListItemLabel>{t("timelineCard.created")}</DataListItemLabel>
                        <DataListItemValue>
                            {formatDate(deal.createdAt, i18n.language).date}
                        </DataListItemValue>
                    </DataListItem>
                    {deal.reservedAt && (
                        <DataListItem>
                            <DataListItemLabel>{t("timelineCard.reserved")}</DataListItemLabel>
                            <DataListItemValue>
                                {formatDate(deal.reservedAt, i18n.language).date}
                            </DataListItemValue>
                        </DataListItem>
                    )}
                    {deal.status === "RESERVED" && deal.reservationExpiresAt && (
                        <DataListItem>
                            <DataListItemLabel>{t("timelineCard.expires")}</DataListItemLabel>
                            <DataListItemValue>
                                {formatDate(deal.reservationExpiresAt, i18n.language).date}
                            </DataListItemValue>
                        </DataListItem>
                    )}
                    {deal.contractNumber && (
                        <DataListItem>
                            <DataListItemLabel>{t("timelineCard.contract")}</DataListItemLabel>
                            <DataListItemValue>
                                № {deal.contractNumber}
                                <div>
                                    {deal.contractDate && `${formatDate(deal.contractDate, i18n.language).date}`}
                                </div>
                            </DataListItemValue>
                        </DataListItem>
                    )}
                    {deal.status === "CANCELLED" && (
                        <>
                            <DataListItem>
                                <DataListItemLabel>{t("timelineCard.cancelled")}</DataListItemLabel>
                                <DataListItemValue>
                                    {deal.cancelledAt && formatDate(deal.cancelledAt, i18n.language).date}
                                    {deal.cancelReason && (
                                        <div className="mt-1 text-xs text-muted-foreground">
                                            {t("timelineCard.reason", { reason: deal.cancelReason })}
                                        </div>
                                    )}
                                </DataListItemValue>
                            </DataListItem>
                        </>
                    )}
                    {deal.note && (
                        <DataListItem>
                            <DataListItemLabel>{t("timelineCard.note")}</DataListItemLabel>
                            <DataListItemValue>{deal.note}</DataListItemValue>
                        </DataListItem>
                    )}
                </DataList>
            </CardContent>
        </Card>
    );
}