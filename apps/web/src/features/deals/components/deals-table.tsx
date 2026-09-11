import {useNavigate} from "react-router-dom";
import {BriefcaseIcon} from "lucide-react";
import {Avatar, AvatarFallback} from "@/components/ui/avatar.tsx";
import {Badge} from "@/components/ui/badge.tsx";
import {TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {DataTable} from "@/components/shared/data-table.tsx";
import {SortableTableHead} from "@/components/shared/sortable-table-head.tsx";
import {DEAL_STATUS_LABEL_KEYS, DEAL_STATUS_VISUALS} from "@/features/deals/types/deal.types";
import type {Deal, DealSortField} from "@/features/deals/api/deals.api";
import {formatCreatedAt, initials} from "@/features/deals/utils/format.ts";
import {useTranslation} from "react-i18next";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";
import type {SortOrder} from "@/hooks/use-sort.ts";

interface DealsTableProps {
    deals: Deal[];
    isLoading: boolean;
    sortBy: DealSortField | undefined;
    sortOrder: SortOrder | undefined;
    onSort(field: DealSortField): void;
}

export function DealsTable({ deals, isLoading, sortBy, sortOrder, onSort }: DealsTableProps) {
    const { t, i18n } = useTranslation("deals");
    const { formatCurrency } = useCompanyFormatters();

    const navigate = useNavigate();

    return (
        <DataTable
            isLoading={isLoading}
            isEmpty={deals.length === 0}
            emptyIcon={<BriefcaseIcon strokeWidth={1.25} />}
            emptyTitle={t("table.emptyTitle")}
            emptyDescription={t("table.emptyDescription")}
            cards={deals.map((deal) => {
                const visual = DEAL_STATUS_VISUALS[deal.status];
                const created = formatCreatedAt(deal.createdAt, i18n.language);

                return (
                    <div
                        key={deal.id}
                        className="cursor-pointer rounded-lg border border-secondary p-4"
                        onClick={() => navigate(`/deals/${deal.id}`)}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="font-medium">{deal.dealNumber}</p>
                                <p className="text-xs text-muted-foreground">№{deal.unit.number} · {deal.project.name}</p>
                            </div>
                            <Badge className={`${visual?.bg} text-white`}>
                                {t(DEAL_STATUS_LABEL_KEYS[deal.status])}
                            </Badge>
                        </div>
                        <div className="mt-3 flex items-center gap-3">
                            <Avatar className="size-9">
                                <AvatarFallback>{initials(deal.client.fullName)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-medium">{deal.client.fullName}</p>
                                <p className="text-xs text-muted-foreground">{deal.client.phone}</p>
                            </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{deal.manager?.fullName ?? "—"}</span>
                            <span className="font-medium">{formatCurrency(deal.salePrice)}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{created.date}</p>
                    </div>
                );
            })}
        >
            <TableHeader>
                <TableRow>
                    <SortableTableHead field="dealNumber" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} className="pl-4">
                        {t("table.dealNumber")}
                    </SortableTableHead>
                    <TableHead>{t("table.unit")}</TableHead>
                    <TableHead>{t("table.client")}</TableHead>
                    <TableHead>{t("table.manager")}</TableHead>
                    <SortableTableHead field="status" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
                        {t("table.status")}
                    </SortableTableHead>
                    <SortableTableHead field="salePrice" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
                        {t("table.salePrice")}
                    </SortableTableHead>
                    <SortableTableHead field="createdAt" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} className="pr-4">
                        {t("table.created")}
                    </SortableTableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {deals.map((deal) => {
                    const visual = DEAL_STATUS_VISUALS[deal.status];
                    const created = formatCreatedAt(deal.createdAt, i18n.language);

                    return (
                        <TableRow key={deal.id} className="cursor-pointer" onClick={() => navigate(`/deals/${deal.id}`)}>
                            <TableCell className="font-medium pl-4">{deal.dealNumber}</TableCell>
                            <TableCell>
                                <p className="font-medium">№{deal.unit.number}</p>
                                <p className="text-xs text-muted-foreground">{deal.project.name}</p>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <Avatar className="size-9">
                                        <AvatarFallback>{initials(deal.client.fullName)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium">{deal.client.fullName}</p>
                                        <p className="text-xs text-muted-foreground">{deal.client.phone}</p>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>{deal.manager?.fullName ?? "—"}</TableCell>
                            <TableCell>
                                <Badge className={`${visual?.bg} text-white`}>
                                    {t(DEAL_STATUS_LABEL_KEYS[deal.status])}
                                </Badge>
                            </TableCell>
                            <TableCell>{formatCurrency(deal.salePrice)}</TableCell>
                            <TableCell className="pr-4">
                                <p>{created.date}</p>
                                <p className="text-xs text-muted-foreground">{created.time}</p>
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </DataTable>
    );
}