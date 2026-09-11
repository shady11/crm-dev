import {Pen, Trash2, UsersRoundIcon} from "lucide-react";
import {Avatar, AvatarFallback} from "@/components/ui/avatar.tsx";
import {Badge} from "@/components/ui/badge.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Checkbox} from "@/components/ui/checkbox.tsx";
import {TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {DataTable} from "@/components/shared/data-table.tsx";
import {SortableTableHead} from "@/components/shared/sortable-table-head.tsx";
import type {ClientSortField} from "@/features/clients/api/clients.api.ts";
import type {Client} from "@/features/clients/types/client.types";
import {formatCreatedAt, initials} from "@/features/clients/utils/format.ts";
import {useNavigate} from "react-router-dom";
import {paths} from "@/routes/paths.ts";
import {useTranslation} from "react-i18next";
import type {SortOrder} from "@/hooks/use-sort.ts";

interface ClientsTableProps {
    clients: Client[];
    isLoading: boolean;
    sortBy: ClientSortField | undefined;
    sortOrder: SortOrder | undefined;
    onSort(field: ClientSortField): void;
    selectedIds: Set<string>;
    allSelected: boolean;
    onToggleAll(checked: boolean): void;
    onToggleOne(id: string, checked: boolean): void;
    onEdit(client: Client): void;
    onDelete(id: string): void;
    isDeleting(id: string): boolean;
}

export function ClientsTable({
                                 clients,
                                 isLoading,
                                 sortBy,
                                 sortOrder,
                                 onSort,
                                 selectedIds,
                                 allSelected,
                                 onToggleAll,
                                 onToggleOne,
                                 onEdit,
                                 onDelete,
                                 isDeleting,
                             }: ClientsTableProps) {

    const { t, i18n } = useTranslation("clients");
    const navigate = useNavigate();

    return (
        <DataTable
            isLoading={isLoading}
            isEmpty={clients.length === 0}
            emptyIcon={<UsersRoundIcon strokeWidth={1.25} />}
            emptyTitle={t("table.emptyTitle")}
            emptyDescription={t("table.emptyDescription")}
            cards={clients.map((client) => {
                const created = formatCreatedAt(client.createdAt, i18n.language);

                return (
                    <div
                        key={client.id}
                        className="cursor-pointer rounded-lg border border-secondary p-4"
                        onClick={() => navigate(paths.clients.detail(client.id))}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <Checkbox
                                    checked={selectedIds.has(client.id)}
                                    onCheckedChange={(details) => onToggleOne(client.id, details.checked === true)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                                <Avatar className="size-9">
                                    <AvatarFallback>{initials(client.fullName)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-medium">{client.fullName}</p>
                                    <p className="text-xs text-muted-foreground">#{client.id.slice(0, 4).toUpperCase()}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon-sm" onClick={() => onEdit(client)} aria-label={t("common:actions.edit")}>
                                    <Pen className="size-3.5" />
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="icon-sm"
                                    disabled={isDeleting(client.id)}
                                    onClick={() => onDelete(client.id)}
                                    aria-label={t("common:actions.delete")}
                                >
                                    <Trash2 className="size-3.5" />
                                </Button>
                            </div>
                        </div>
                        <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                            <p>{client.phone}</p>
                            <p>{client.email}</p>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                            <Badge variant="secondary">{t("table.leads")}: {client._count.leads}</Badge>
                            <Badge variant="secondary">{t("table.deals")}: {client._count.deals}</Badge>
                            <span className="ml-auto text-xs text-muted-foreground">{created.date}</span>
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
                    <TableHead>{t("table.clientId")}</TableHead>
                    <SortableTableHead field="fullName" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
                        {t("table.name")}
                    </SortableTableHead>
                    <SortableTableHead field="phone" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
                        {t("table.phone")}
                    </SortableTableHead>
                    <SortableTableHead field="email" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
                        {t("table.email")}
                    </SortableTableHead>
                    <TableHead>{t("table.leads")}</TableHead>
                    <TableHead>{t("table.deals")}</TableHead>
                    <SortableTableHead field="createdAt" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
                        {t("table.created")}
                    </SortableTableHead>
                    <TableHead className="text-right">{t("table.actions")}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {clients.map((client) => {
                    const created = formatCreatedAt(client.createdAt, i18n.language);

                    return (
                        <TableRow key={client.id} className="cursor-pointer" onClick={() => navigate(paths.clients.detail(client.id))}>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                    checked={selectedIds.has(client.id)}
                                    onCheckedChange={(details) => onToggleOne(client.id, details.checked === true)}
                                />
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                                #{client.id.slice(0, 4).toUpperCase()}
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <Avatar className="size-9">
                                        <AvatarFallback>{initials(client.fullName)}</AvatarFallback>
                                    </Avatar>
                                    <p className="font-medium">{client.fullName}</p>
                                </div>
                            </TableCell>
                            <TableCell>
                                {client.phone}
                            </TableCell>
                            <TableCell>
                                {client.email}
                            </TableCell>
                            <TableCell>
                                <Badge variant="secondary">{client._count.leads}</Badge>
                            </TableCell>
                            <TableCell>
                                <Badge variant="secondary">{client._count.deals}</Badge>
                            </TableCell>
                            <TableCell>
                                <p>{created.date}</p>
                                <p className="text-sm text-muted-foreground">{created.time}</p>
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1">
                                    <Button variant="ghost" size="icon-sm" onClick={() => onEdit(client)} aria-label={t("common:actions.edit")}>
                                        <Pen className="size-3.5" />
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="icon-sm"
                                        disabled={isDeleting(client.id)}
                                        onClick={() => onDelete(client.id)}
                                        aria-label={t("common:actions.delete")}
                                    >
                                        <Trash2 className="size-3.5" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </DataTable>
    );
}