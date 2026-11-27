import {Link} from "react-router-dom";
import {UsersIcon} from "lucide-react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {DataTable} from "@/components/shared/data-table.tsx";
import type {ManagerPerformanceRow} from "@/features/dashboard/api/dashboard.api.ts";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";
import {paths} from "@/routes/paths.ts";
import {useTranslation} from "react-i18next";

const percent = (value: number) => `${Math.round(value * 100)}%`;

// Each manager's results over the dashboard's period, best seller first:
// a team lead's own branch (their own row included), or every branch's
// managers for the owner.
export function ManagerPerformanceCard({data, isLoading}: {data: ManagerPerformanceRow[]; isLoading: boolean}) {
    const {t} = useTranslation("dashboard");
    const {formatCurrency, formatNumber} = useCompanyFormatters();

    const rows = [...data].sort((a, b) => b.salesVolume - a.salesVolume || b.cashCollected - a.cashCollected);
    const totals = rows.reduce(
        (sum, row) => ({
            contractsSigned: sum.contractsSigned + row.contractsSigned,
            salesVolume: sum.salesVolume + row.salesVolume,
            cashCollected: sum.cashCollected + row.cashCollected,
            newLeads: sum.newLeads + row.newLeads,
            converted: sum.converted + row.conversionRate * row.newLeads,
            overdueAmount: sum.overdueAmount + row.overdueAmount,
        }),
        {contractsSigned: 0, salesVolume: 0, cashCollected: 0, newLeads: 0, converted: 0, overdueAmount: 0},
    );

    const name = (row: ManagerPerformanceRow) => (
        <Link to={paths.deals.byManager(row.manager.id)} className="font-medium hover:underline">
            {row.isViewer ? t("managerPerformance.you", {name: row.manager.fullName}) : row.manager.fullName}
            {row.branch ? <span className="font-normal text-muted-foreground"> · {row.branch.name}</span> : null}
        </Link>
    );

    const overdue = (row: ManagerPerformanceRow) => row.overdueAmount > 0 ? (
        <Link to={paths.deals.attention("overdue_payments", row.manager.id)} className="font-medium text-destructive hover:underline">
            {formatCurrency(row.overdueAmount)}
        </Link>
    ) : <span className="text-muted-foreground">—</span>;

    return (
        <Card className="border pt-0">
            <CardHeader className="border-b py-4">
                <CardTitle className="text-sm text-muted-foreground">{t("managerPerformance.title")}</CardTitle>
            </CardHeader>
            <CardContent>
                <DataTable
                    isLoading={isLoading}
                    isEmpty={rows.length === 0}
                    emptyIcon={<UsersIcon strokeWidth={1.25} />}
                    emptyTitle={t("managerPerformance.emptyTitle")}
                    emptyDescription={t("managerPerformance.emptyDescription")}
                    cards={rows.map((row) => (
                        <div key={row.manager.id} className="space-y-3 rounded-lg border border-secondary p-4 text-sm">
                            {name(row)}
                            <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
                                <dt className="text-muted-foreground">{t("managerPerformance.columns.contracts")}</dt><dd>{formatNumber(row.contractsSigned)}</dd>
                                <dt className="text-muted-foreground">{t("managerPerformance.columns.salesVolume")}</dt><dd>{formatCurrency(row.salesVolume)}</dd>
                                <dt className="text-muted-foreground">{t("managerPerformance.columns.cash")}</dt><dd>{formatCurrency(row.cashCollected)}</dd>
                                <dt className="text-muted-foreground">{t("managerPerformance.columns.newLeads")}</dt><dd>{formatNumber(row.newLeads)}</dd>
                                <dt className="text-muted-foreground">{t("managerPerformance.columns.conversion")}</dt><dd>{percent(row.conversionRate)}</dd>
                                <dt className="text-muted-foreground">{t("managerPerformance.columns.overdue")}</dt><dd>{overdue(row)}</dd>
                            </dl>
                        </div>
                    ))}
                >
                    <TableHeader>
                        <TableRow>
                            <TableHead className="pl-4">{t("managerPerformance.columns.manager")}</TableHead>
                            <TableHead className="text-right">{t("managerPerformance.columns.contracts")}</TableHead>
                            <TableHead className="text-right">{t("managerPerformance.columns.salesVolume")}</TableHead>
                            <TableHead className="text-right">{t("managerPerformance.columns.cash")}</TableHead>
                            <TableHead className="text-right">{t("managerPerformance.columns.newLeads")}</TableHead>
                            <TableHead className="text-right">{t("managerPerformance.columns.conversion")}</TableHead>
                            <TableHead className="pr-4 text-right">{t("managerPerformance.columns.overdue")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.map((row) => (
                            <TableRow key={row.manager.id} className={row.isViewer ? "bg-muted/30" : undefined}>
                                <TableCell className="pl-4">{name(row)}</TableCell>
                                <TableCell className="text-right tabular-nums">{formatNumber(row.contractsSigned)}</TableCell>
                                <TableCell className="text-right tabular-nums">{formatCurrency(row.salesVolume)}</TableCell>
                                <TableCell className="text-right tabular-nums">{formatCurrency(row.cashCollected)}</TableCell>
                                <TableCell className="text-right tabular-nums">{formatNumber(row.newLeads)}</TableCell>
                                <TableCell className="text-right tabular-nums">{percent(row.conversionRate)}</TableCell>
                                <TableCell className="pr-4 text-right tabular-nums">{overdue(row)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                    {rows.length > 1 ? (
                        <TableFooter>
                            <TableRow>
                                <TableCell className="pl-4 font-medium">{t("managerPerformance.total")}</TableCell>
                                <TableCell className="text-right tabular-nums">{formatNumber(totals.contractsSigned)}</TableCell>
                                <TableCell className="text-right tabular-nums">{formatCurrency(totals.salesVolume)}</TableCell>
                                <TableCell className="text-right tabular-nums">{formatCurrency(totals.cashCollected)}</TableCell>
                                <TableCell className="text-right tabular-nums">{formatNumber(totals.newLeads)}</TableCell>
                                <TableCell className="text-right tabular-nums">
                                    {percent(totals.newLeads > 0 ? totals.converted / totals.newLeads : 0)}
                                </TableCell>
                                <TableCell className="pr-4 text-right tabular-nums">{formatCurrency(totals.overdueAmount)}</TableCell>
                            </TableRow>
                        </TableFooter>
                    ) : null}
                </DataTable>
            </CardContent>
        </Card>
    );
}
