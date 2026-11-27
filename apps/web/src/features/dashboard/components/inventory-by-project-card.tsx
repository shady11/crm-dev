import {Link} from "react-router-dom";
import {HouseIcon} from "lucide-react";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {Progress} from "@/components/ui/progress.tsx";
import {DataTable} from "@/components/shared/data-table.tsx";
import type {InventoryByProjectRow} from "@/features/dashboard/api/dashboard.api.ts";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";
import {UNIT_STATUS_LABEL_KEYS} from "@/features/units/types/unit.types.ts";
import {paths} from "@/routes/paths.ts";
import {useTranslation} from "react-i18next";

const percent = (value: number) => `${Math.round(value * 100)}%`;

// Stock per project: what's left to sell and what it's worth, what's on
// hold and what's gone. Values at today's list price.
export function InventoryByProjectCard({data, isLoading}: {data: InventoryByProjectRow[]; isLoading: boolean}) {
    const {t} = useTranslation(["dashboard", "units"]);
    const {formatCurrency, formatNumber} = useCompanyFormatters();

    const totals = data.reduce(
        (sum, row) => ({
            total: sum.total + row.total,
            availableCount: sum.availableCount + row.available.count,
            availableValue: sum.availableValue + row.available.value,
            reservedCount: sum.reservedCount + row.reserved.count,
            reservedValue: sum.reservedValue + row.reserved.value,
            soldCount: sum.soldCount + row.sold.count,
            soldValue: sum.soldValue + row.sold.value,
        }),
        {total: 0, availableCount: 0, availableValue: 0, reservedCount: 0, reservedValue: 0, soldCount: 0, soldValue: 0},
    );

    const cell = (count: number, value: number) => (
        <>
            <span className="font-medium">{formatNumber(count)}</span>
            <span className="block text-xs text-muted-foreground">{formatCurrency(value)}</span>
        </>
    );

    const soldCell = (share: number) => (
        <div className="ml-auto flex w-28 items-center gap-2">
            <Progress className="h-1 flex-1" value={Math.round(share * 100)} aria-hidden />
            <span className="w-9 text-right">{percent(share)}</span>
        </div>
    );

    return (
        <Card className="border pt-0">
            <CardHeader className="border-b py-4">
                <CardTitle className="text-sm text-muted-foreground">{t("inventory.title")}</CardTitle>
                <CardDescription className="text-xs">{t("inventory.listPriceNote")}</CardDescription>
            </CardHeader>
            <CardContent>
                <DataTable
                    isLoading={isLoading}
                    isEmpty={data.length === 0}
                    emptyIcon={<HouseIcon strokeWidth={1.25} />}
                    emptyTitle={t("inventory.emptyTitle")}
                    emptyDescription={t("inventory.emptyDescription")}
                    cards={data.map((row) => (
                        <div key={row.project.id} className="space-y-3 rounded-lg border border-secondary p-4 text-sm">
                            <Link to={paths.projects.detail(row.project.id)} className="font-medium hover:underline">{row.project.name}</Link>
                            <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                                <dt className="text-muted-foreground">{t(UNIT_STATUS_LABEL_KEYS.AVAILABLE)}</dt><dd>{cell(row.available.count, row.available.value)}</dd>
                                <dt className="text-muted-foreground">{t(UNIT_STATUS_LABEL_KEYS.RESERVED)}</dt><dd>{cell(row.reserved.count, row.reserved.value)}</dd>
                                <dt className="text-muted-foreground">{t(UNIT_STATUS_LABEL_KEYS.SOLD)}</dt><dd>{cell(row.sold.count, row.sold.value)}</dd>
                                <dt className="text-muted-foreground">{t("inventory.columns.soldShare")}</dt><dd>{percent(row.soldShare)}</dd>
                            </dl>
                        </div>
                    ))}
                >
                    <TableHeader>
                        <TableRow>
                            <TableHead className="pl-4">{t("inventory.columns.project")}</TableHead>
                            <TableHead className="text-right">{t("inventory.columns.units")}</TableHead>
                            <TableHead className="text-right">{t(UNIT_STATUS_LABEL_KEYS.AVAILABLE)}</TableHead>
                            <TableHead className="text-right">{t(UNIT_STATUS_LABEL_KEYS.RESERVED)}</TableHead>
                            <TableHead className="text-right">{t(UNIT_STATUS_LABEL_KEYS.SOLD)}</TableHead>
                            <TableHead className="pr-4 text-right">{t("inventory.columns.soldShare")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((row) => (
                            <TableRow key={row.project.id}>
                                <TableCell className="pl-4">
                                    <Link to={paths.projects.detail(row.project.id)} className="font-medium hover:underline">{row.project.name}</Link>
                                </TableCell>
                                <TableCell className="text-right tabular-nums">{formatNumber(row.total)}</TableCell>
                                <TableCell className="text-right tabular-nums">{cell(row.available.count, row.available.value)}</TableCell>
                                <TableCell className="text-right tabular-nums">{cell(row.reserved.count, row.reserved.value)}</TableCell>
                                <TableCell className="text-right tabular-nums">{cell(row.sold.count, row.sold.value)}</TableCell>
                                <TableCell className="pr-4 text-right tabular-nums">{soldCell(row.soldShare)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                    {data.length > 1 ? (
                        <TableFooter>
                            <TableRow>
                                <TableCell className="pl-4 font-medium">{t("inventory.total")}</TableCell>
                                <TableCell className="text-right tabular-nums">{formatNumber(totals.total)}</TableCell>
                                <TableCell className="text-right tabular-nums">{cell(totals.availableCount, totals.availableValue)}</TableCell>
                                <TableCell className="text-right tabular-nums">{cell(totals.reservedCount, totals.reservedValue)}</TableCell>
                                <TableCell className="text-right tabular-nums">{cell(totals.soldCount, totals.soldValue)}</TableCell>
                                <TableCell className="pr-4 text-right tabular-nums">
                                    {soldCell(totals.total > 0 ? totals.soldCount / totals.total : 0)}
                                </TableCell>
                            </TableRow>
                        </TableFooter>
                    ) : null}
                </DataTable>
            </CardContent>
        </Card>
    );
}
