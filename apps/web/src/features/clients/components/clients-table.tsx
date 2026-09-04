import {Pen, Trash2, UsersRoundIcon} from "lucide-react";
import {Avatar, AvatarFallback} from "@/components/ui/avatar.tsx";
import {Badge} from "@/components/ui/badge.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Checkbox} from "@/components/ui/checkbox.tsx";
import {Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/components/ui/empty.tsx";
import {Spinner} from "@/components/ui/spinner.tsx";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import type {Client} from "@/features/clients/types/client.types";
import {formatCreatedAt, initials} from "@/features/clients/utils/format.ts";
import {useNavigate} from "react-router-dom";
import {paths} from "@/routes/paths.ts";
import {useTranslation} from "react-i18next";

interface ClientsTableProps {
    clients: Client[];
    isLoading: boolean;
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

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center rounded-lg border border-secondary">
                <Spinner className="size-6" />
            </div>
        );
    }

    if (clients.length === 0) {
        return (
            <Empty>
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <UsersRoundIcon strokeWidth={1.25} />
                    </EmptyMedia>
                    <EmptyTitle>{t("table.emptyTitle")}</EmptyTitle>
                    <EmptyDescription>{t("table.emptyDescription")}</EmptyDescription>
                </EmptyHeader>
            </Empty>
        );
    }

    return (
        <div className="rounded-lg border border-secondary">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-10">
                            <Checkbox
                                checked={allSelected}
                                onCheckedChange={(details) => onToggleAll(details.checked === true)}
                            />
                        </TableHead>
                        <TableHead>{t("table.clientId")}</TableHead>
                        <TableHead>{t("table.name")}</TableHead>
                        <TableHead>{t("table.phone")}</TableHead>
                        <TableHead>{t("table.email")}</TableHead>
                        <TableHead>{t("table.leads")}</TableHead>
                        <TableHead>{t("table.deals")}</TableHead>
                        <TableHead>{t("table.created")}</TableHead>
                        <TableHead className="text-right">{t("table.actions")}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {clients.map((client) => {
                        const created = formatCreatedAt(client.createdAt, i18n.language);

                        return (
                            <TableRow key={client.id} className="cursor-pointer" onClick={() => navigate(paths.clients.detail(client.id))}>
                                <TableCell>
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
                                <TableCell>
                                    <div className="flex items-center justify-end gap-1">
                                        <Button variant="ghost" size="icon-sm" onClick={() => onEdit(client)}>
                                            <Pen className="size-3.5" />
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="icon-sm"
                                            disabled={isDeleting(client.id)}
                                            onClick={() => onDelete(client.id)}
                                        >
                                            <Trash2 className="size-3.5" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}