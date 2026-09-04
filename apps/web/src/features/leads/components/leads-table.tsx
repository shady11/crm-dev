import {UsersRoundIcon} from "lucide-react";
import {Avatar, AvatarFallback} from "@/components/ui/avatar.tsx";
import {Badge} from "@/components/ui/badge.tsx";
import {Checkbox} from "@/components/ui/checkbox.tsx";
import {Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/components/ui/empty.tsx";
import {Spinner} from "@/components/ui/spinner.tsx";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import type {Lead} from "@/features/leads/api/leads.api.ts";
import {LEAD_STATUS_CLASSES, LEAD_STATUS_LABEL_KEYS} from "@/features/leads/types/lead.types.ts";
import {formatCreatedAt, initials} from "@/features/leads/utils/format.ts";
import {useTranslation} from "react-i18next";

interface LeadsTableProps {
    leads: Lead[];
    isLoading: boolean;
    selectedIds: Set<string>;
    allSelected: boolean;
    onToggleAll(checked: boolean): void;
    onToggleOne(id: string, checked: boolean): void;
    onRowClick(lead: Lead): void;
}

export function LeadsTable({
                                leads,
                                isLoading,
                                selectedIds,
                                allSelected,
                                onToggleAll,
                                onToggleOne,
                                onRowClick,
                            }: LeadsTableProps) {
    const { t, i18n } = useTranslation("leads");

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center rounded-lg border border-secondary">
                <Spinner className="size-6" />
            </div>
        );
    }

    if (leads.length === 0) {
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
                        <TableHead>{t("table.lead")}</TableHead>
                        <TableHead>{t("table.status")}</TableHead>
                        <TableHead>{t("table.manager")}</TableHead>
                        <TableHead>{t("table.created")}</TableHead>
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
            </Table>
        </div>
    );
}
