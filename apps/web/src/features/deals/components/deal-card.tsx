import {CheckCircle2Icon, Dot} from "lucide-react";
import {DEAL_STATUS_VISUALS, type UnitDealHistoryEntry} from "@/features/deals/types/deal.types.ts";
import {daysUntil} from "@/features/deals/utils/days-until.ts";
import {DataList, DataListItem, DataListItemLabel, DataListItemValue} from "@/components/ui/data-list";
import {formatDate} from "@/utils/date-formatter.ts";
import {Button} from "@/components/ui/button.tsx";
import {Link} from "react-router-dom";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";
import {useTranslation} from "react-i18next";

export function DealCard({ deal }: { deal: UnitDealHistoryEntry }) {
    const { t, i18n } = useTranslation("deals");
    const { formatCurrency } = useCompanyFormatters();
    const visual = DEAL_STATUS_VISUALS[deal.status];
    const Icon = visual?.icon ?? CheckCircle2Icon;
    const daysLeft = deal.status === "RESERVED" ? daysUntil(deal.reservationExpiresAt) : null;

    return (
        <div className="flex flex-col gap-4 w-full max-w-md border rounded-lg p-4">
            <div className="flex items-center">
                <div className="flex items-center gap-4">
                    <div className={`icon-tile flex size-7 shrink-0 items-center justify-center ${visual?.bg}`}>
                        <Icon size={16} strokeWidth={2}/>
                    </div>
                    <div className="flex flex-col">
                        <div className="text-lg font-medium">
                            {visual && t(visual.headingKey)}
                        </div>
                        <div className="flex items-center text-xs font-normal text-muted-foreground">
                            <p>#{deal.dealNumber}</p>
                            {daysLeft !== null && (
                                <>
                                    <Dot size={16}/>
                                    <p>
                                        {daysLeft > 0 ? t("card.daysLeft", { count: daysLeft }) : daysLeft === 0 ? t("card.expiresToday") : t("card.expired")}
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <Button variant="link" size="sm" className="ml-auto">
                    <Link to={`/deals/${deal.id}`}>{t("card.dealDetails")}</Link>
                </Button>
            </div>
            <div className="flex justify-between gap-4">
                <DataList orientation="vertical">
                    <DataListItem>
                        <DataListItemLabel>{t("card.client")}</DataListItemLabel>
                        <DataListItemValue>
                            {deal.client.fullName}
                        </DataListItemValue>
                    </DataListItem>
                    <DataListItem>
                        <DataListItemLabel>{t("card.reservedAt")}</DataListItemLabel>
                        <DataListItemValue>
                            {deal.reservedAt ? formatDate(deal.reservedAt, i18n.language).date : "—"}
                        </DataListItemValue>
                    </DataListItem>
                </DataList>
                <DataList orientation="vertical">
                    <DataListItem>
                        <DataListItemLabel>{t("card.salePrice")}</DataListItemLabel>
                        <DataListItemValue>
                            {formatCurrency(parseFloat(deal.salePrice))}
                        </DataListItemValue>
                    </DataListItem>
                    <DataListItem>
                        <DataListItemLabel>{t("card.expiresAt")}</DataListItemLabel>
                        <DataListItemValue>
                            {deal.reservationExpiresAt ? formatDate(deal.reservationExpiresAt, i18n.language).date : "—"}
                        </DataListItemValue>
                    </DataListItem>
                </DataList>
                <DataList orientation="vertical">
                    <DataListItem>
                        <DataListItemLabel>{t("card.deposit")}</DataListItemLabel>
                        <DataListItemValue>
                            {formatCurrency(deal.deposit ? parseFloat(deal.deposit) : 0)}
                        </DataListItemValue>
                    </DataListItem>
                    <DataListItem>
                        <DataListItemLabel>{t("card.manager")}</DataListItemLabel>
                        <DataListItemValue>
                            {deal.manager?.fullName ?? "—"}
                        </DataListItemValue>
                    </DataListItem>
                </DataList>
            </div>
        </div>
    );
}