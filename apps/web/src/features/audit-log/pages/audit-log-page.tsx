import {useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {createListCollection} from "@ark-ui/react";
import {ScrollText} from "lucide-react";
import {Switch} from "@/components/ui/switch.tsx";
import {DateField} from "@/components/shared/date-field.tsx";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {Spinner} from "@/components/ui/spinner.tsx";
import {Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/components/ui/empty.tsx";
import {Pagination, PaginationItems, PaginationNext, PaginationPrevious} from "@/components/ui/pagination.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {formatDate} from "@/utils/date-formatter";
import {getCompanies} from "@/features/companies/api/companies.api";
import {getAuditLogs} from "../api/audit-log.api";
import {AUDIT_ACTIONS, type AuditAction} from "../types/audit-log.types";

export function AuditLogPage() {
    const {t, i18n} = useTranslation("auditLog");
    const [companyId, setCompanyId] = useState("");
    // SA-11: sign-ins are most of the log; hidden by default.
    const [hideLogins, setHideLogins] = useState(true);
    const [action, setAction] = useState<AuditAction | undefined>(undefined);
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [page, setPage] = useState(1);
    const limit = 20;

    const logs = useQuery({
        queryKey: ["audit-logs", {companyId, action, hideLogins, dateFrom, dateTo, page}],
        queryFn: () =>
            getAuditLogs({
                companyId: companyId || undefined,
                action,
                hideLogins,
                dateFrom: dateFrom || undefined,
                dateTo: dateTo || undefined,
                page,
                limit,
            }),
    });

    // SA-11: pick a company by name. Deleted companies keep their history,
    // so they are offered too, marked as deleted.
    const companies = useQuery({
        queryKey: ["companies", "audit-log-filter"],
        queryFn: async () => {
            const [live, deleted] = await Promise.all([
                getCompanies({limit: 100}),
                getCompanies({status: "deleted", limit: 100}),
            ]);
            return [
                ...live.items.map((company) => ({id: company.id, name: company.name})),
                ...deleted.items.map((company) => ({
                    id: company.id,
                    name: t("page.filters.deletedCompany", {name: company.name}),
                })),
            ];
        },
    });

    const companyCollection = createListCollection({
        items: [
            {label: t("page.filters.allCompanies"), value: "ALL"},
            ...(companies.data ?? []).map((company) => ({label: company.name, value: company.id})),
        ],
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
                <h2 className="text-2xl font-bold tracking-tight">{t("page.heading")}</h2>
                <p className="text-muted-foreground text-sm">{t("page.description")}</p>
            </div>

            <div className="flex flex-wrap items-end gap-3">
                <label className="block space-y-1.5">
                    <span className="text-sm font-medium">{t("page.filters.company")}</span>
                    <Select
                        collection={companyCollection}
                        value={[companyId || "ALL"]}
                        onValueChange={(item) => {
                            setCompanyId(item.value[0] === "ALL" ? "" : (item.value[0] ?? ""));
                            setPage(1);
                        }}
                    >
                        <SelectTrigger className="w-64" aria-label={t("page.filters.company")}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {companyCollection.items.map((item) => (
                                <SelectItem key={item.value} item={item}>
                                    {item.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
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
                        <SelectTrigger className="w-64" aria-label={t("page.filters.action")}>
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

                <div className="space-y-1.5">
                    <span className="text-sm font-medium">{t("page.filters.dateFrom")}</span>
                    <DateField
                        className="w-44"
                        clearable
                        value={dateFrom}
                        max={dateTo}
                        onChange={(value) => {
                            setDateFrom(value);
                            setPage(1);
                        }}
                    />
                </div>

                <div className="space-y-1.5">
                    <span className="text-sm font-medium">{t("page.filters.dateTo")}</span>
                    <DateField
                        className="w-44"
                        clearable
                        value={dateTo}
                        min={dateFrom}
                        onChange={(value) => {
                            setDateTo(value);
                            setPage(1);
                        }}
                    />
                </div>

                <label className="flex h-9 items-center gap-2 text-sm">
                    <Switch
                        checked={hideLogins}
                        // Picking a sign-in action shows sign-ins whatever this says.
                        disabled={action === "LOGIN_SUCCEEDED" || action === "LOGIN_FAILED"}
                        onCheckedChange={({checked}) => {
                            setHideLogins(checked);
                            setPage(1);
                        }}
                        aria-label={t("page.filters.hideLogins")}
                    />
                    {t("page.filters.hideLogins")}
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
                                <TableHead>{t("page.table.headers.company")}</TableHead>
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
                                        <TableCell>
                                            {entry.targetName ?? (
                                                // A target that no longer resolves keeps its short id.
                                                <span className="text-muted-foreground text-xs">
                                                    {entry.targetType}
                                                    {entry.targetId ? ` #${entry.targetId.slice(0, 8)}` : ""}
                                                </span>
                                            )}
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
