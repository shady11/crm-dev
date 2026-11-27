import {useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {createListCollection} from "@ark-ui/react";
import {ScrollText} from "lucide-react";
import {Toggle} from "@/components/ui/toggle.tsx";
import {FilterPopover} from "@/components/shared/filter-popover.tsx";
import {DateField} from "@/components/shared/date-field.tsx";
import {TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {DataTable} from "@/components/shared/data-table.tsx";
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

    const when = (createdAt: string) => {
        const {date, time} = formatDate(createdAt, i18n.language);
        return `${date} ${time}`;
    };

    const target = (entry: (typeof items)[number]) =>
        entry.targetName ?? (
            // A target that no longer resolves keeps its short id.
            <span className="text-muted-foreground text-xs">
                {entry.targetType}
                {entry.targetId ? ` #${entry.targetId.slice(0, 8)}` : ""}
            </span>
        );

    return (
        <div className="space-y-6">
            {/* Title, then the sign-ins toggle and the filters together on the right, as on the Activity log. */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-bold tracking-tight">{t("page.heading")}</h2>
                <div className="flex flex-wrap items-center gap-2">
                    <Toggle
                        variant="outline"
                        size="md"
                        pressed={hideLogins}
                        // Picking a sign-in action shows sign-ins whatever this says.
                        disabled={action === "LOGIN_SUCCEEDED" || action === "LOGIN_FAILED"}
                        onPressedChange={(pressed) => {
                            setHideLogins(pressed);
                            setPage(1);
                        }}
                    >
                        {t("page.filters.hideLogins")}
                    </Toggle>
                    <FilterPopover
                        activeCount={[companyId, action, dateFrom, dateTo].filter(Boolean).length}
                        onReset={() => {
                            setCompanyId("");
                            setAction(undefined);
                            setDateFrom("");
                            setDateTo("");
                            setPage(1);
                        }}
                    >
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
                                <SelectTrigger className="w-full" aria-label={t("page.filters.company")}>
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
                                <SelectTrigger className="w-full" aria-label={t("page.filters.action")}>
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
                                className="w-full"
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
                                className="w-full"
                                clearable
                                value={dateTo}
                                min={dateFrom}
                                onChange={(value) => {
                                    setDateTo(value);
                                    setPage(1);
                                }}
                            />
                        </div>
                    </FilterPopover>
                </div>
            </div>

            <DataTable
                isLoading={logs.isLoading}
                isEmpty={items.length === 0}
                emptyIcon={<ScrollText />}
                emptyTitle={t("page.empty.title")}
                emptyDescription={t("page.empty.description")}
                // On phones a card per entry, as on Login activity.
                cards={items.map((entry) => (
                    <div key={entry.id} className="space-y-1 rounded-lg border bg-card p-4 text-sm">
                        <div className="flex items-baseline justify-between gap-3">
                            <p className="min-w-0 truncate font-medium">{t(`page.actions.${entry.action}`)}</p>
                            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{when(entry.createdAt)}</span>
                        </div>
                        <p className="truncate">{target(entry)}</p>
                        <p className="truncate text-xs text-muted-foreground">
                            {[entry.actorEmail, entry.company?.name].filter(Boolean).join(" · ")}
                        </p>
                    </div>
                ))}
            >
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
                    {items.map((entry) => (
                        <TableRow key={entry.id}>
                            <TableCell className="text-muted-foreground whitespace-nowrap text-xs tabular-nums">{when(entry.createdAt)}</TableCell>
                            <TableCell>{entry.actorEmail}</TableCell>
                            <TableCell>{t(`page.actions.${entry.action}`)}</TableCell>
                            <TableCell>{target(entry)}</TableCell>
                            <TableCell>{entry.company?.name ?? "—"}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </DataTable>

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
