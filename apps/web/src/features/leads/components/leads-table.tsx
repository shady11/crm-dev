import {UsersRoundIcon} from "lucide-react";
import {Avatar, AvatarFallback} from "@/components/ui/avatar.tsx";
import {Badge} from "@/components/ui/badge.tsx";
import {Checkbox} from "@/components/ui/checkbox.tsx";
import {TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {DataTable} from "@/components/shared/data-table.tsx";
import {SortableTableHead} from "@/components/shared/sortable-table-head.tsx";
import type {Lead, LeadSortField} from "@/features/leads/api/leads.api.ts";
import {LEAD_STATUS_CLASSES, LEAD_STATUS_LABEL_KEYS} from "@/features/leads/types/lead.types.ts";
import {formatCreatedAt, initials} from "@/features/leads/utils/format.ts";
import {useTranslation} from "react-i18next";
import type {SortOrder} from "@/hooks/use-sort.ts";

interface LeadsTableProps {
    leads: Lead[];
    isLoading: boolean;
    sortBy: LeadSortField | undefined;
    sortOrder: SortOrder | undefined;
    onSort(field: LeadSortField): void;
    selectedIds: Set<string>;
    allSelected: boolean;
    onToggleAll(checked: boolean): void;
    onToggleOne(id: string, checked: boolean): void;
    onRowClick(lead: Lead): void;
}

export function LeadsTable({
                                leads,
                                isLoading,
                                sortBy,
                                sortOrder,
                                onSort,
                                selectedIds,
                                allSelected,
                                onToggleAll,
                                onToggleOne,
                                onRowClick,
                            }: LeadsTableProps) {
    const { t, i18n } = useTranslation("leads");

    return (
        <DataTable
            isLoading={isLoading}
            isEmpty={leads.length === 0}
            emptyIcon={<UsersRoundIcon strokeWidth={1.25} />}
            emptyTitle={t("table.emptyTitle")}
            emptyDescription={t("table.emptyDescription")}
            cards={leads.map((lead) => {
                const created = formatCreatedAt(lead.createdAt, i18n.language);

                return (
                    <div
                        key={lead.id}
                        className="cursor-pointer rounded-lg border border-secondary p-4"
                        onClick={() => onRowClick(lead)}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <Checkbox
                                    checked={selectedIds.has(lead.id)}
                                    onCheckedChange={(details) => onToggleOne(lead.id, details.checked === true)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                                <Avatar className="size-9">
                                    <AvatarFallback>{initials(lead.fullName)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-medium">{lead.fullName}</p>
                                    <p className="text-xs text-muted-foreground">{lead.phone}</p>
                                </div>
                            </div>
                            <Badge className={`${LEAD_STATUS_CLASSES[lead.status]} text-white`}>
                                {t(LEAD_STATUS_LABEL_KEYS[lead.status])}
                            </Badge>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                            <span>{lead.manager?.fullName ?? "—"}</span>
                            <span>{created.date}</span>
                        </div>
                    </div>
                );
            })}
        >
            <TableHeader>
                <TableRow>
                    <TableHead className="w-10">
                        <Checkbox
                            checked={allSelected}
                            onCheckedChange={(details) => onToggleAll(details.checked === true)}
                        />
                    </TableHead>
                    <SortableTableHead field="fullName" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
                        {t("table.lead")}
                    </SortableTableHead>
                    <SortableTableHead field="status" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
                        {t("table.status")}
                    </SortableTableHead>
                    <TableHead>{t("table.manager")}</TableHead>
                    <SortableTableHead field="createdAt" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
                        {t("table.created")}
                    </SortableTableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {leads.map((lead) => {
                    const created = formatCreatedAt(lead.createdAt, i18n.language);

                    return (
                        <TableRow
                            key={lead.id}
                            className="cursor-pointer"
                            onClick={() => onRowClick(lead)}
                        >
                            <TableCell onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                    checked={selectedIds.has(lead.id)}
                                    onCheckedChange={(details) => onToggleOne(lead.id, details.checked === true)}
                                />
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <Avatar className="size-9">
                                        <AvatarFallback>{initials(lead.fullName)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium">{lead.fullName}</p>
                                        <p className="text-xs text-muted-foreground">{lead.phone}</p>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge className={`${LEAD_STATUS_CLASSES[lead.status]} text-white`}>
                                    {t(LEAD_STATUS_LABEL_KEYS[lead.status])}
                                </Badge>
                            </TableCell>
                            <TableCell>{lead.manager?.fullName ?? "—"}</TableCell>
                            <TableCell>
                                <p>{created.date}</p>
                                <p className="text-sm text-muted-foreground">{created.time}</p>
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </DataTable>
    );
}
