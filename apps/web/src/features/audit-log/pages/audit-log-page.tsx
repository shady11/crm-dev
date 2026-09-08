import {useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {createListCollection} from "@ark-ui/react";
import {ScrollText} from "lucide-react";
import {Input} from "@/components/ui/input.tsx";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {Spinner} from "@/components/ui/spinner.tsx";
import {Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/components/ui/empty.tsx";
import {Pagination, PaginationItems, PaginationNext, PaginationPrevious} from "@/components/ui/pagination.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {formatDate} from "@/utils/date-formatter";
import {getAuditLogs} from "../api/audit-log.api";
import {AUDIT_ACTIONS, type AuditAction} from "../types/audit-log.types";

export function AuditLogPage() {
    const {t, i18n} = useTranslation("auditLog");
    const [companyId, setCompanyId] = useState("");
    const [action, setAction] = useState<AuditAction | undefined>(undefined);
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [page, setPage] = useState(1);
    const limit = 20;

    const logs = useQuery({
        queryKey: ["audit-logs", {companyId, action, dateFrom, dateTo, page}],
        queryFn: () =>
            getAuditLogs({
                companyId: companyId || undefined,
                action,
                dateFrom: dateFrom || undefined,
                dateTo: dateTo || undefined,
                page,
                limit,
            }),
    });

    const actionCollection = createListCollection({
        items: [
            {label: t("page.filters.allActions"), value: "ALL"},
            ...AUDIT_ACTIONS.map((a) => ({label: t(`page.actions.${a}`), value: a})),
        ],
    });

    const items = logs.data?.items ?? [];
    const total = logs.data?.meta.total ?? 0;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-medium tracking-tight">{t("page.heading")}</h2>
                <p className="text-muted-foreground text-sm">{t("page.description")}</p>
            </div>

            <div className="flex flex-wrap items-end gap-3">
                <label className="block space-y-1.5">
                    <span className="text-sm font-medium">{t("page.filters.companyId")}</span>
                    <Input
                        placeholder={t("page.filters.companyIdPlaceholder")}
                        value={companyId}
                        onChange={(event) => {
                            setCompanyId(event.target.value);
                            setPage(1);
                        }}
                        className="w-64"
                    />
                </label>

                <label className="block space-y-1.5">
                    <span className="text-sm font-medium">{t("page.filters.action")}</span>
                    <Select
                        collection={actionCollection}
                        value={[action ?? "ALL"]}
                        onValueChange={(item) => {
                            setAction(item.value[0] === "ALL" ? undefined : (item.value[0] as AuditAction));
                            setPage(1);
                        }}
                    >
                        <SelectTrigger className="w-64">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {actionCollection.items.map((item) => (
                                <SelectItem key={item.value} item={item}>
                                    {item.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </label>

                <label className="block space-y-1.5">
                    <span className="text-sm font-medium">{t("page.filters.dateFrom")}</span>
                    <Input
                        type="date"
                        value={dateFrom}
                        onChange={(event) => {
                            setDateFrom(event.target.value);
                            setPage(1);
                        }}
                    />
                </label>

                <label className="block space-y-1.5">
                    <span className="text-sm font-medium">{t("page.filters.dateTo")}</span>
                    <Input
                        type="date"
                        value={dateTo}
                        onChange={(event) => {
                            setDateTo(event.target.value);
                            setPage(1);
                        }}
                    />
                </label>
            </div>

            {logs.isLoading ? (
                <div className="flex h-48 items-center justify-center">
                    <Spinner />
                </div>
            ) : items.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <ScrollText />
                        </EmptyMedia>
                        <EmptyTitle>{t("page.empty.title")}</EmptyTitle>
                        <EmptyDescription>{t("page.empty.description")}</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("page.table.headers.timestamp")}</TableHead>
                                <TableHead>{t("page.table.headers.actor")}</TableHead>
                                <TableHead>{t("page.table.headers.action")}</TableHead>
                                <TableHead>{t("page.table.headers.target")}</TableHead>
                                <TableHead>{t("page.table.headers.tenant")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((entry) => {
                                const {date, time} = formatDate(entry.createdAt, i18n.language);

                                return (
                                    <TableRow key={entry.id}>
                                        <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                                            {date} {time}
                                        </TableCell>
                                        <TableCell>{entry.actorEmail}</TableCell>
                                        <TableCell>{t(`page.actions.${entry.action}`)}</TableCell>
                                        <TableCell className="text-muted-foreground text-xs">
                                            {entry.targetType}
                                            {entry.targetId ? ` #${entry.targetId.slice(0, 8)}` : ""}
                                        </TableCell>
                                        <TableCell>{entry.company?.name ?? "—"}</TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}

            {total > limit ? (
                <Pagination
                    className="justify-end"
                    count={total}
                    pageSize={limit}
                    page={page}
                    siblingCount={1}
                    onPageChange={(details) => setPage(details.page)}
                >
                    <PaginationPrevious />
                    <PaginationItems />
                    <PaginationNext />
                </Pagination>
            ) : null}
        </div>
    );
}
