import {Card, CardContent, CardHeader} from "@/components/ui/card.tsx";
import {DataList, DataListItem, DataListItemLabel, DataListItemValue} from "@/components/ui/data-list.tsx";
import type {Deal} from "@/features/deals/api/deals.api.ts";
import {formatDate} from "@/utils/date-formatter.ts";

export function     DealTimelineCard({ deal }: { deal: Deal }) {
    return (
        <Card className="border border-secondary shadow-none flex-1">
            <CardHeader title="Timeline" className="py-4 border-b gap-0"></CardHeader>
            <CardContent>
                <DataList className="divide-y">
                    <DataListItem>
                        <DataListItemLabel>Created</DataListItemLabel>
                        <DataListItemValue>
                            {formatDate(deal.createdAt).date}
                        </DataListItemValue>
                    </DataListItem>
                    {deal.reservedAt && (
                        <DataListItem>
                            <DataListItemLabel>Reserved</DataListItemLabel>
                            <DataListItemValue>
                                {formatDate(deal.reservedAt).date}
                            </DataListItemValue>
                        </DataListItem>
                    )}
                    {deal.status === "RESERVED" && deal.reservationExpiresAt && (
                        <DataListItem>
                            <DataListItemLabel>Expires</DataListItemLabel>
                            <DataListItemValue>
                                {formatDate(deal.reservationExpiresAt).date}
                            </DataListItemValue>
                        </DataListItem>
                    )}
                    {deal.contractNumber && (
                        <DataListItem>
                            <DataListItemLabel>Contract</DataListItemLabel>
                            <DataListItemValue>
                                № {deal.contractNumber}
                                <div>
                                    {deal.contractDate && `${formatDate(deal.contractDate).date}`}
                                </div>
                            </DataListItemValue>
                        </DataListItem>
                    )}
                    {deal.status === "CANCELLED" && (
                        <>
                            <DataListItem>
                                <DataListItemLabel>Cancelled</DataListItemLabel>
                                <DataListItemValue>
                                    {deal.cancelledAt && formatDate(deal.cancelledAt).date}
                                    {deal.cancelReason && (
                                        <div className="mt-1 text-xs text-muted-foreground">
                                            Reason: {deal.cancelReason}
                                        </div>
                                    )}
                                </DataListItemValue>
                            </DataListItem>
                        </>
                    )}
                    {deal.note && (
                        <DataListItem>
                            <DataListItemLabel>Note</DataListItemLabel>
                            <DataListItemValue>{deal.note}</DataListItemValue>
                        </DataListItem>
                    )}
                </DataList>
            </CardContent>
        </Card>
    );
}