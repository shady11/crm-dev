import {useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {ShieldCheck} from "lucide-react";
import {Badge} from "@/components/ui/badge.tsx";
import {TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {DataTable} from "@/components/shared/data-table.tsx";
import {Pagination, PaginationItems, PaginationNext, PaginationPrevious} from "@/components/ui/pagination.tsx";
import {formatDate} from "@/utils/date-formatter";
import {getOwnLogins} from "../api/audit-log.api";
import type {AuditLogEntry} from "../types/audit-log.types";

export function LoginActivityPage() {
    const {t, i18n} = useTranslation("auditLog");
    const [page, setPage] = useState(1);
    const limit = 20;

    const logins = useQuery({
        queryKey: ["own-logins", page],
        queryFn: () => getOwnLogins({page, limit}),
    });

    const items = logins.data?.items ?? [];
    const total = logins.data?.meta.total ?? 0;

    const when = (entry: AuditLogEntry) => {
        const {date, time} = formatDate(entry.createdAt, i18n.language);
        return `${date} ${time}`;
    };

    // Green for a successful sign-in, red for a failed one (with its reason
    // when the API gives one), as soft pills like the other statuses.
    const result = (entry: AuditLogEntry) => {
        const succeeded = entry.action === "LOGIN_SUCCEEDED";
        const reason = (entry.metadata as {reason?: string} | null)?.reason;
        return (
            <Badge className={succeeded ? "bg-emerald-500" : "bg-rose-500"}>
                {succeeded
                    ? t("page.actions.LOGIN_SUCCEEDED")
                    : reason
                      ? t(`loginActivity.reasons.${reason}`)
                      : t("page.actions.LOGIN_FAILED")}
            </Badge>
        );
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight">{t("loginActivity.heading")}</h2>

            <DataTable
                isLoading={logins.isLoading}
                isEmpty={items.length === 0}
                emptyIcon={<ShieldCheck />}
                emptyTitle={t("loginActivity.empty.title")}
                emptyDescription={t("loginActivity.empty.description")}
                // On phones a card per sign-in, so the result isn't cut off.
                cards={items.map((entry) => (
                    <div key={entry.id} className="space-y-1.5 rounded-lg border bg-card p-4">
                        <div className="flex items-baseline justify-between gap-3">
                            <p className="min-w-0 truncate font-medium">{entry.actorEmail}</p>
                            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{when(entry)}</span>
                        </div>
                        {result(entry)}
                    </div>
                ))}
            >
                <TableHeader>
                    <TableRow>
                        <TableHead>{t("loginActivity.table.timestamp")}</TableHead>
                        <TableHead>{t("loginActivity.table.user")}</TableHead>
                        <TableHead>{t("loginActivity.table.result")}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map((entry) => (
                        <TableRow key={entry.id}>
                            <TableCell className="text-muted-foreground whitespace-nowrap text-xs tabular-nums">
                                {when(entry)}
                            </TableCell>
                            <TableCell>{entry.actorEmail}</TableCell>
                            <TableCell>{result(entry)}</TableCell>
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
