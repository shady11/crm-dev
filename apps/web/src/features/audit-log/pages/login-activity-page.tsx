import {useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {ShieldCheck} from "lucide-react";
import {Badge} from "@/components/ui/badge.tsx";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {Spinner} from "@/components/ui/spinner.tsx";
import {Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/components/ui/empty.tsx";
import {Pagination, PaginationItems, PaginationNext, PaginationPrevious} from "@/components/ui/pagination.tsx";
import {formatDate} from "@/utils/date-formatter";
import {getOwnLogins} from "../api/audit-log.api";

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

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-medium tracking-tight">{t("loginActivity.heading")}</h2>
                <p className="text-muted-foreground text-sm">{t("loginActivity.description")}</p>
            </div>

            {logins.isLoading ? (
                <div className="flex h-48 items-center justify-center">
                    <Spinner />
                </div>
            ) : items.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <ShieldCheck />
                        </EmptyMedia>
                        <EmptyTitle>{t("loginActivity.empty.title")}</EmptyTitle>
                        <EmptyDescription>{t("loginActivity.empty.description")}</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("loginActivity.table.timestamp")}</TableHead>
                                <TableHead>{t("loginActivity.table.user")}</TableHead>
                                <TableHead>{t("loginActivity.table.result")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((entry) => {
                                const {date, time} = formatDate(entry.createdAt, i18n.language);
                                const succeeded = entry.action === "LOGIN_SUCCEEDED";
                                const reason = (entry.metadata as {reason?: string} | null)?.reason;

                                return (
                                    <TableRow key={entry.id}>
                                        <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                                            {date} {time}
                                        </TableCell>
                                        <TableCell>{entry.actorEmail}</TableCell>
                                        <TableCell>
                                            <Badge variant={succeeded ? "secondary" : "destructive"}>
                                                {succeeded
                                                    ? t("page.actions.LOGIN_SUCCEEDED")
                                                    : reason
                                                      ? t(`loginActivity.reasons.${reason}`)
                                                      : t("page.actions.LOGIN_FAILED")}
                                            </Badge>
                                        </TableCell>
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
