import {Card, CardContent, CardHeader} from "@/components/ui/card.tsx";
import {DataList, DataListItem, DataListItemLabel, DataListItemValue} from "@/components/ui/data-list.tsx";
import type {DealDetails} from "@/features/deals/api/deals.api.ts";
import {useTranslation} from "react-i18next";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";
import {FINANCING_TYPE_LABEL_KEYS} from "@/features/deals/types/deal.types.ts";

interface DealFinancialsCardProps {
    deal: DealDetails;
    totalPaid: number;
    remaining: number;
}

export function DealFinancialsCard({ deal, totalPaid, remaining }: DealFinancialsCardProps) {
    const { t } = useTranslation("deals");
    const { formatCurrency } = useCompanyFormatters();

    const listPricePerSqM =
        deal.unit.area > 0
            ? Math.round(deal.unit.price / deal.unit.area)
            : 0;
    const salePricePerSqM =
        deal.unit.area > 0
            ? Math.round(deal.salePrice / deal.unit.area)
            : 0;

    return (
        <Card className="border border-secondary shadow-none flex-1 pt-0">
            <CardHeader title={t("financials.title")} className="py-4 border-b gap-0"></CardHeader>
            <CardContent>
                <div className="text-sm font-medium uppercase mb-2">{t("financials.unitSection")}</div>
                <DataList className="divide-y mb-4">
                    <DataListItem className="justify-between">
                        <DataListItemLabel>{t("financials.listPrice")}</DataListItemLabel>
                        <DataListItemValue className="flex-none">{formatCurrency(deal.listPrice)}</DataListItemValue>
                    </DataListItem>
                    <DataListItem className="justify-between">
                        <DataListItemLabel>{t("financials.pricePerMeter")}</DataListItemLabel>
                        <DataListItemValue className="flex-none">{formatCurrency(listPricePerSqM)}/m²</DataListItemValue>
                    </DataListItem>
                </DataList>

                <div className="text-sm font-medium uppercase mb-2">{t("financials.dealSection")}</div>
                <DataList className="divide-y mb-4">
                    <DataListItem className="justify-between">
                        <DataListItemLabel>{t("financials.salePrice")}</DataListItemLabel>
                        <DataListItemValue className="flex-none font-medium text-lg">
                            {formatCurrency(deal.salePrice)}
                            <div className="font-normal text-sm text-end">
                                {formatCurrency(salePricePerSqM)}/m²
                            </div>
                        </DataListItemValue>
                    </DataListItem>
                    {deal.discountPercent != null && deal.discountPercent > 0 && (
                        <DataListItem className="justify-between">
                            <DataListItemLabel>{t("financials.discount")}</DataListItemLabel>
                            <DataListItemValue className="flex-none">
                                {deal.discountPercent}%
                                {deal.discountAmount != null && ` (${formatCurrency(deal.discountAmount)})`}
                            </DataListItemValue>
                        </DataListItem>
                    )}
                    <DataListItem className="justify-between">
                        <DataListItemLabel>{t("financials.paid")}</DataListItemLabel>
                        <DataListItemValue className="flex-none">{formatCurrency(totalPaid)}</DataListItemValue>
                    </DataListItem>
                    <DataListItem className="justify-between">
                        <DataListItemLabel>{t("financials.remaining")}</DataListItemLabel>
                        <DataListItemValue className="flex-none">{formatCurrency(remaining)}</DataListItemValue>
                    </DataListItem>
                    {deal.financingType && (
                        <DataListItem className="justify-between">
                            <DataListItemLabel>{t("financials.financing")}</DataListItemLabel>
                            <DataListItemValue className="flex-none">{t(FINANCING_TYPE_LABEL_KEYS[deal.financingType])}</DataListItemValue>
                        </DataListItem>
                    )}
                </DataList>
            </CardContent>
        </Card>
    );
}