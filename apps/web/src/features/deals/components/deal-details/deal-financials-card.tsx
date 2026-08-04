import {Card, CardContent, CardHeader} from "@/components/ui/card.tsx";
import {DataList, DataListItem, DataListItemLabel, DataListItemValue} from "@/components/ui/data-list.tsx";
import type {DealDetails} from "@/features/deals/api/deals.api.ts";

export function DealFinancialsCard({ deal }: { deal: DealDetails }) {
    const totalPaid = deal.payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = deal.salePrice - totalPaid;

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
            <CardHeader title="Financials" className="py-4 border-b gap-0"></CardHeader>
            <CardContent>
                <div className="text-sm font-medium uppercase mb-2">Unit</div>
                <DataList className="divide-y mb-4">
                    <DataListItem className="justify-between">
                        <DataListItemLabel>List price</DataListItemLabel>
                        <DataListItemValue className="flex-none">{deal.listPrice.toLocaleString("ru-RU")} $</DataListItemValue>
                    </DataListItem>
                    <DataListItem className="justify-between">
                        <DataListItemLabel>Price per meter</DataListItemLabel>
                        <DataListItemValue className="flex-none">{listPricePerSqM.toLocaleString("ru-RU")} $/m²</DataListItemValue>
                    </DataListItem>
                </DataList>

                <div className="text-sm font-medium uppercase mb-2">Deal</div>
                <DataList className="divide-y mb-4">
                    <DataListItem className="justify-between">
                        <DataListItemLabel>Sale price</DataListItemLabel>
                        <DataListItemValue className="flex-none font-medium text-lg">
                            {deal.salePrice.toLocaleString("ru-RU")} $
                            <div className="font-normal text-sm text-end">
                                {salePricePerSqM.toLocaleString("ru-RU")} $/m²
                            </div>
                        </DataListItemValue>
                    </DataListItem>
                    {deal.discountPercent != null && deal.discountPercent > 0 && (
                        <DataListItem className="justify-between">
                            <DataListItemLabel>Discount</DataListItemLabel>
                            <DataListItemValue className="flex-none">
                                {deal.discountPercent}%
                                {deal.discountAmount != null && ` (${deal.discountAmount.toLocaleString("ru-RU")} $)`}
                            </DataListItemValue>
                        </DataListItem>
                    )}
                    <DataListItem className="justify-between">
                        <DataListItemLabel>Paid</DataListItemLabel>
                        <DataListItemValue className="flex-none">{totalPaid.toLocaleString("ru-RU")} $</DataListItemValue>
                    </DataListItem>
                    <DataListItem className="justify-between">
                        <DataListItemLabel>Remaining</DataListItemLabel>
                        <DataListItemValue className="flex-none">{remaining.toLocaleString("ru-RU")} $</DataListItemValue>
                    </DataListItem>
                    {deal.financingType && (
                        <DataListItem className="justify-between">
                            <DataListItemLabel>Financing</DataListItemLabel>
                            <DataListItemValue className="flex-none">{deal.financingType}</DataListItemValue>
                        </DataListItem>
                    )}
                </DataList>
            </CardContent>
        </Card>
    );
}