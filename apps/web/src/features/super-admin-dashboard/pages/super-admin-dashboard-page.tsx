import {Link} from "react-router-dom";
import {useQuery} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {Building2Icon, PauseCircleIcon, PlayCircleIcon, ScrollTextIcon, UserCogIcon, UsersIcon} from "lucide-react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {Spinner} from "@/components/ui/spinner.tsx";
import {Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/components/ui/empty.tsx";
import {KpiCard} from "@/features/dashboard/components/kpi-card.tsx";
import {formatDate} from "@/utils/date-formatter";
import {getAuditLogs} from "@/features/audit-log/api/audit-log.api";
import {getSuperAdminDashboardStats} from "../api/super-admin-dashboard.api";

export function SuperAdminDashboardPage() {
    const {t, i18n} = useTranslation("superAdminDashboard");
    const {t: tAuditLog} = useTranslation("auditLog");

    const stats = useQuery({
        queryKey: ["super-admin-dashboard-stats"],
        queryFn: getSuperAdminDashboardStats,
    });

    const recentActivity = useQuery({
        queryKey: ["audit-logs", {page: 1, limit: 5}],
        queryFn: () => getAuditLogs({page: 1, limit: 5}),
    });

    const activeImpersonations = stats.data?.activeImpersonations ?? [];
    const recentEntries = recentActivity.data?.items ?? [];

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-medium tracking-tight">{t("page.heading")}</h2>
                    <p className="text-muted-foreground text-sm">{t("page.description")}</p>
                </div>
                <Button variant="secondary" asChild>
                    <Link to="/companies">{t("page.manageCompanies")}</Link>
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard
                    icon={Building2Icon}
                    label={t("kpi.totalCompanies")}
                    value={stats.data ? String(stats.data.companies.total) : "—"}
                    accent="bg-blue-500"
                />
                <KpiCard
                    icon={PlayCircleIcon}
                    label={t("kpi.activeCompanies")}
                    value={stats.data ? String(stats.data.companies.active) : "—"}
                    accent="bg-emerald-500"
                />
                <KpiCard
                    icon={PauseCircleIcon}
                    label={t("kpi.suspendedCompanies")}
                    value={stats.data ? String(stats.data.companies.suspended) : "—"}
                    accent={stats.data && stats.data.companies.suspended > 0 ? "bg-amber-500" : "bg-gray-400"}
                />
                <KpiCard
                    icon={UsersIcon}
                    label={t("kpi.totalUsers")}
                    value={stats.data ? String(stats.data.totalUsers) : "—"}
                    accent="bg-violet-500"
                />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <Card className="border border-secondary shadow-none pt-0">
                    <CardHeader className="border-b py-4">
                        <CardTitle className="text-sm text-muted-foreground">
                            {t("activeImpersonations.title")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        {stats.isLoading ? (
                            <div className="flex h-32 items-center justify-center">
                                <Spinner />
                            </div>
                        ) : activeImpersonations.length === 0 ? (
                            <Empty>
                                <EmptyHeader>
                                    <EmptyMedia variant="icon">
                                        <UserCogIcon />
                                    </EmptyMedia>
                                    <EmptyTitle>{t("activeImpersonations.empty")}</EmptyTitle>
                                </EmptyHeader>
                            </Empty>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t("activeImpersonations.table.superAdmin")}</TableHead>
                                        <TableHead>{t("activeImpersonations.table.target")}</TableHead>
                                        <TableHead>{t("activeImpersonations.table.company")}</TableHead>
                                        <TableHead>{t("activeImpersonations.table.expiresAt")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {activeImpersonations.map((session) => {
                                        const {date, time} = formatDate(session.expiresAt, i18n.language);
                                        return (
                                            <TableRow key={session.id}>
                                                <TableCell className="text-sm">{session.superAdmin.email}</TableCell>
                                                <TableCell className="text-sm">{session.targetUser.email}</TableCell>
                                                <TableCell className="text-sm">{session.company.name}</TableCell>
                                                <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                                                    {date} {time}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                <Card className="border border-secondary shadow-none pt-0">
                    <CardHeader className="flex items-center justify-between border-b py-4">
                        <CardTitle className="text-sm text-muted-foreground">
                            {t("recentActivity.title")}
                        </CardTitle>
                        <Button variant="ghost" size="sm" asChild>
                            <Link to="/audit-log">{t("recentActivity.viewAll")}</Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="pt-4">
                        {recentActivity.isLoading ? (
                            <div className="flex h-32 items-center justify-center">
                                <Spinner />
                            </div>
                        ) : recentEntries.length === 0 ? (
                            <Empty>
                                <EmptyHeader>
                                    <EmptyMedia variant="icon">
                                        <ScrollTextIcon />
                                    </EmptyMedia>
                                    <EmptyTitle>{t("recentActivity.empty")}</EmptyTitle>
                                </EmptyHeader>
                            </Empty>
                        ) : (
                            <div className="flex flex-col divide-y">
                                {recentEntries.map((entry) => {
                                    const {date, time} = formatDate(entry.createdAt, i18n.language);
                                    return (
                                        <div key={entry.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                                            <div className="min-w-0">
                                                <p className="truncate">
                                                    <span className="font-medium">{entry.actorEmail}</span>{" "}
                                                    {tAuditLog(`page.actions.${entry.action}`)}
                                                    {entry.company ? ` · ${entry.company.name}` : ""}
                                                </p>
                                                <p className="text-muted-foreground text-xs">
                                                    {date} {time}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
