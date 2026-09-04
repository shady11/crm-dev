import {CheckCircle2Icon, Dot} from "lucide-react";
import {DEAL_STATUS_VISUALS, type UnitDealHistoryEntry} from "@/features/deals/types/deal.types.ts";
import {daysUntil} from "@/features/deals/utils/days-until.ts";
import {DataList, DataListItem, DataListItemLabel, DataListItemValue} from "@/components/ui/data-list";
import {formatDate} from "@/utils/date-formatter.ts";
import {Button} from "@/components/ui/button.tsx";
import {Link} from "react-router-dom";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";

export function DealCard({ deal }: { deal: UnitDealHistoryEntry }) {
    const { formatCurrency } = useCompanyFormatters();
    const visual = DEAL_STATUS_VISUALS[deal.status];
    const Icon = visual?.icon ?? CheckCircle2Icon;
    const daysLeft = deal.status === "RESERVED" ? daysUntil(deal.reservationExpiresAt) : null;

    return (
        <div className="flex flex-col gap-4 w-full max-w-md border rounded-lg p-4">
            <div className="flex items-center">
                <div className="flex items-center gap-4">
                    <div className={`rounded-lg ${visual?.bg} p-2 text-white`}>
                        <Icon size={20}/>
                    </div>
                    <div className="flex flex-col">
                        <div className="text-lg font-medium">
                            {visual?.heading}
                        </div>
                        <div className="flex items-center text-xs font-normal text-muted-foreground">
                            <p>#{deal.dealNumber}</p>
                            {daysLeft !== null && (
                                <>
                                    <Dot size={16}/>
                                    <p>
                                        {daysLeft > 0 ? `${daysLeft}d left` : daysLeft === 0 ? "Expires today" : "Expired"}
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <Button variant="link" size="sm" className="ml-auto">
                    <Link to={`/deals/${deal.id}`}>Deal details</Link>
                </Button>
            </div>
            <div className="flex justify-between gap-4">
                <DataList orientation="vertical">
                    <DataListItem>
                        <DataListItemLabel>Client</DataListItemLabel>
                        <DataListItemValue>
                            {deal.client.fullName}
                        </DataListItemValue>
                    </DataListItem>
                    <DataListItem>
                        <DataListItemLabel>Reserved at</DataListItemLabel>
                        <DataListItemValue>
                            {deal.reservedAt ? formatDate(deal.reservedAt).date : "—"}
                        </DataListItemValue>
                    </DataListItem>
                </DataList>
                <DataList orientation="vertical">
                    <DataListItem>
                        <DataListItemLabel>Sale price</DataListItemLabel>
                        <DataListItemValue>
                            {formatCurrency(parseFloat(deal.salePrice))}
                        </DataListItemValue>
                    </DataListItem>
                    <DataListItem>
                        <DataListItemLabel>Expires at</DataListItemLabel>
                        <DataListItemValue>
                            {deal.reservationExpiresAt ? formatDate(deal.reservationExpiresAt).date : "—"}
                        </DataListItemValue>
                    </DataListItem>
                </DataList>
                <DataList orientation="vertical">
                    <DataListItem>
                        <DataListItemLabel>Deposit</DataListItemLabel>
                        <DataListItemValue>
                            {formatCurrency(deal.deposit ? parseFloat(deal.deposit) : 0)}
                        </DataListItemValue>
                    </DataListItem>
                    <DataListItem>
                        <DataListItemLabel>Manager</DataListItemLabel>
                        <DataListItemValue>
                            {deal.manager?.fullName ?? "—"}
                        </DataListItemValue>
                    </DataListItem>
                </DataList>
            </div>
        </div>
    );

    // return (
    //     <div className={`flex flex-col gap-2.5 rounded-xl border p-3.5 ${visual?.bg}`}>
    //         <div className="flex items-center gap-3">
    //             <div className={`flex size-9 shrink-0 items-center justify-center rounded-full ${visual?.bg}`}>
    //                 <Icon size={16} className={visual?.iconColor} />
    //             </div>
    //             <div className="min-w-0 flex-1">
    //                 <p className={`text-sm font-semibold ${visual?.text}`}>{visual?.heading}</p>
    //                 <p className="truncate text-sm text-muted-foreground">{deal.client.fullName}</p>
    //             </div>
    //             <div className="shrink-0 text-right">
    //                 <p className={`font-semibold ${visual?.text}`}>
    //                     {parseFloat(deal.salePrice).toLocaleString("en-US")} $
    //                 </p>
    //                 {daysLeft !== null && (
    //                     <p className="text-xs text-muted-foreground">
    //                         {daysLeft > 0 ? `${daysLeft}d left` : daysLeft === 0 ? "Expires today" : "Expired"}
    //                     </p>
    //                 )}
    //             </div>
    //         </div>
    //
    //         <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-current/10 pt-2 text-xs text-muted-foreground">
    //             {deal.manager && <span>Manager: {deal.manager.fullName}</span>}
    //             {deal.client.phone && <span>{deal.client.phone}</span>}
    //             {deal.reservedAt && <span>Reserved {new Date(deal.reservedAt).toLocaleDateString()}</span>}
    //             {deal.status !== "RESERVED" && deal.reservationExpiresAt && (
    //                 <span>Was due {new Date(deal.reservationExpiresAt).toLocaleDateString()}</span>
    //             )}
    //             {deal.contractDate && <span>Contract {new Date(deal.contractDate).toLocaleDateString()}</span>}
    //             {deal.status === "CANCELLED" && deal.cancelledAt && (
    //                 <span>Cancelled {new Date(deal.cancelledAt).toLocaleDateString()}</span>
    //             )}
    //         </div>
    //
    //         {deal.status === "CANCELLED" && deal.cancelReason && (
    //             <p className="text-xs italic text-muted-foreground">"{deal.cancelReason}"</p>
    //         )}
    //     </div>
    // );
}