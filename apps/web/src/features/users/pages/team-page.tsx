import {useState} from "react";
import {Link} from "react-router-dom";
import {useQuery} from "@tanstack/react-query";
import {createListCollection} from "@ark-ui/react";
import {UsersIcon} from "lucide-react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {Avatar, AvatarFallback} from "@/components/ui/avatar.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {DataTable} from "@/components/shared/data-table.tsx";
import {useAuth} from "@/features/auth/hooks/use-auth.ts";
import {hasPermission} from "@/features/auth/access.ts";
import {useCompanyFormatters} from "@/features/auth/hooks/use-company-formatters.ts";
import {useTeamPerformance, useTeamSnapshot} from "@/features/dashboard/hooks/use-dashboard.ts";
import type {TeamPerformanceItem, TeamSnapshotItem} from "@/features/dashboard/api/dashboard.api.ts";
import {timeAgo} from "@/features/dashboard/utils/time-ago.ts";
import {getUsers} from "@/features/users/api/users.api.ts";
import {UserStatusDot} from "@/features/users/components/user-status-dot.tsx";
import {HandOverDialog} from "@/features/users/components/hand-over-dialog.tsx";
import {Button} from "@/components/ui/button.tsx";
import {initials} from "@/features/deals/utils/format.ts";
import {paths} from "@/routes/paths.ts";
import {useTranslation} from "react-i18next";

const PERIODS = [7, 30, 90] as const;

type Row = TeamPerformanceItem & { snapshot?: TeamSnapshotItem };

const percent = (value: number) => `${Math.round(value * 100)}%`;

/**
 * The Sales Head's read-only view of their branch: how each manager is doing
 * (workload now, results over a period) and who's in the branch. Everything
 * here is already limited to the viewer's own branch by the API.
 */
export function TeamPage() {
    const {t} = useTranslation(["users", "dashboard"]);
    const {user} = useAuth();
    const {formatCurrency, formatNumber} = useCompanyFormatters();
    const [days, setDays] = useState<number>(30);

    const canViewResults = hasPermission(user, "dashboard.team_snapshot");
    // SH-5: moving someone's leads and deals needs both reassignments.
    const canHandOver = hasPermission(user, "leads.assign") && hasPermission(user, "deals.reassign");
    const [handingOver, setHandingOver] = useState<{id: string; fullName: string; branchId: string | null} | null>(null);
    const performance = useTeamPerformance(canViewResults, days);
    const snapshot = useTeamSnapshot(canViewResults);
    const members = useQuery({
        queryKey: ["users", "team"],
        queryFn: () => getUsers({limit: 100}),
    });

    const rows: Row[] = (performance.data?.managers ?? []).map((item) => ({
        ...item,
        snapshot: snapshot.data?.find((s) => s.manager.id === item.manager.id),
    }));

    const totals = rows.reduce(
        (sum, row) => ({
            openLeads: sum.openLeads + (row.snapshot?.openLeads ?? 0),
            activeDeals: sum.activeDeals + (row.snapshot?.activeDeals ?? 0),
            tasksDue: sum.tasksDue + (row.snapshot?.tasksDue ?? 0),
            followUpsOverdue: sum.followUpsOverdue + (row.snapshot?.followUpsOverdue ?? 0),
            overdueAmount: sum.overdueAmount + row.overduePayments.amount,
            leadsAssigned: sum.leadsAssigned + row.leadsAssigned,
            dealsWon: sum.dealsWon + row.dealsWon,
            revenue: sum.revenue + row.revenue,
        }),
        {openLeads: 0, activeDeals: 0, tasksDue: 0, followUpsOverdue: 0, overdueAmount: 0, leadsAssigned: 0, dealsWon: 0, revenue: 0},
    );

    const periodCollection = createListCollection({
        items: PERIODS.map((value) => ({label: t("team.period", {count: value}), value: String(value)})),
    });

    // The viewer's own row (SH-9): their bookings, leads and tasks count in
    // the branch's totals too, so the totals match the dashboard's.
    const displayName = (row: Row) => row.isViewer ? t("team.you", {name: row.manager.fullName}) : row.manager.fullName;

    const openLeadsCell = (row: Row) => row.snapshot ? (
        <Link to={paths.openLeadsByManager(row.manager.id)} className="hover:underline">
            {row.snapshot.openLeads}
        </Link>
    ) : "—";

    // Missed follow-ups (SH-6): links to exactly the leads counted.
    const followUpsCell = (row: Row) => row.snapshot?.followUpsOverdue ? (
        <Link to={paths.overdueFollowUps(row.manager.id)} className="font-medium text-destructive hover:underline">
            {row.snapshot.followUpsOverdue}
        </Link>
    ) : row.snapshot ? "0" : "—";

    const overdueCell = (row: Row) => row.overduePayments.installments > 0 ? (
        <Link to={paths.deals.attention("overdue_payments", row.manager.id)} className="font-medium text-destructive hover:underline">
            {formatCurrency(row.overduePayments.amount)}
        </Link>
    ) : <span className="text-muted-foreground">—</span>;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{t("team.title")}</h2>
                    {user?.branch ? <p className="text-sm text-muted-foreground">{user.branch.name}</p> : null}
                </div>
                {canViewResults ? (
                    <Select
                        collection={periodCollection}
                        value={[String(days)]}
                        onValueChange={({value}) => setDays(Number(value[0] ?? 30))}
                    >
                        <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {periodCollection.items.map((item) => <SelectItem key={item.value} item={item}>{item.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                ) : null}
            </div>

            {canViewResults ? (
                <Card className="border border-secondary shadow-none pt-0">
                    <CardHeader className="border-b py-4">
                        <CardTitle className="text-sm text-muted-foreground">{t("team.resultsHeading")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <DataTable
                            isLoading={performance.isLoading}
                            isEmpty={rows.length === 0}
                            emptyIcon={<UsersIcon strokeWidth={1.25} />}
                            emptyTitle={t("team.emptyTitle")}
                            emptyDescription={t("team.emptyDescription")}
                            cards={rows.map((row) => (
                                <div key={row.manager.id} className="space-y-3 rounded-lg border border-secondary p-4 text-sm">
                                    <Link to={paths.deals.byManager(row.manager.id)} className="font-medium hover:underline">
                                        {displayName(row)}
                                    </Link>
                                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
                                        <dt className="text-muted-foreground">{t("team.columns.openLeads")}</dt><dd>{openLeadsCell(row)}</dd>
                                        <dt className="text-muted-foreground">{t("team.columns.activeDeals")}</dt><dd>{row.snapshot?.activeDeals ?? "—"}</dd>
                                        <dt className="text-muted-foreground">{t("team.columns.tasksOverdue")}</dt><dd>{row.snapshot?.tasksDue ?? "—"}</dd>
                                        <dt className="text-muted-foreground">{t("team.columns.followUpsOverdue")}</dt><dd>{followUpsCell(row)}</dd>
                                        <dt className="text-muted-foreground">{t("team.columns.overduePayments")}</dt><dd>{overdueCell(row)}</dd>
                                        <dt className="text-muted-foreground">{t("team.columns.leadsAssigned")}</dt><dd>{row.leadsAssigned}</dd>
                                        <dt className="text-muted-foreground">{t("team.columns.dealsWon")}</dt><dd>{row.dealsWon}</dd>
                                        <dt className="text-muted-foreground">{t("team.columns.conversion")}</dt><dd>{percent(row.conversionRate)}</dd>
                                        <dt className="text-muted-foreground">{t("team.columns.collected")}</dt><dd>{formatCurrency(row.revenue)}</dd>
                                    </dl>
                                </div>
                            ))}
                        >
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="pl-4">{t("team.columns.manager")}</TableHead>
                                    <TableHead className="text-right">{t("team.columns.openLeads")}</TableHead>
                                    <TableHead className="text-right">{t("team.columns.activeDeals")}</TableHead>
                                    <TableHead className="text-right">{t("team.columns.tasksOverdue")}</TableHead>
                                    <TableHead className="text-right">{t("team.columns.followUpsOverdue")}</TableHead>
                                    <TableHead className="text-right">{t("team.columns.overduePayments")}</TableHead>
                                    <TableHead className="border-l text-right">{t("team.columns.leadsAssigned")}</TableHead>
                                    <TableHead className="text-right">{t("team.columns.dealsWon")}</TableHead>
                                    <TableHead className="text-right">{t("team.columns.conversion")}</TableHead>
                                    <TableHead className="pr-4 text-right">{t("team.columns.collected")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map((row) => (
                                    <TableRow key={row.manager.id} className={row.isViewer ? "bg-muted/30" : undefined}>
                                        <TableCell className="pl-4">
                                            <Link to={paths.deals.byManager(row.manager.id)} className="flex items-center gap-3 hover:underline">
                                                <Avatar className="size-8 shrink-0">
                                                    <AvatarFallback>{initials(row.manager.fullName)}</AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0">
                                                    <p className="font-medium">{displayName(row)}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {row.snapshot?.lastActivityAt
                                                            ? timeAgo(t, row.snapshot.lastActivityAt)
                                                            : t("teamSnapshot.noActivity", {ns: "dashboard"})}
                                                    </p>
                                                </div>
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">{openLeadsCell(row)}</TableCell>
                                        <TableCell className="text-right tabular-nums">{row.snapshot?.activeDeals ?? "—"}</TableCell>
                                        <TableCell className={`text-right tabular-nums ${row.snapshot?.tasksDue ? "text-destructive" : ""}`}>
                                            {row.snapshot?.tasksDue ?? "—"}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">{followUpsCell(row)}</TableCell>
                                        <TableCell className="text-right tabular-nums">{overdueCell(row)}</TableCell>
                                        <TableCell className="border-l text-right tabular-nums">{formatNumber(row.leadsAssigned)}</TableCell>
                                        <TableCell className="text-right tabular-nums">{formatNumber(row.dealsWon)}</TableCell>
                                        <TableCell className="text-right tabular-nums">{percent(row.conversionRate)}</TableCell>
                                        <TableCell className="pr-4 text-right tabular-nums">{formatCurrency(row.revenue)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                            <TableFooter>
                                <TableRow>
                                    <TableCell className="pl-4 font-medium">{t("team.total")}</TableCell>
                                    <TableCell className="text-right tabular-nums">{totals.openLeads}</TableCell>
                                    <TableCell className="text-right tabular-nums">{totals.activeDeals}</TableCell>
                                    <TableCell className="text-right tabular-nums">{totals.tasksDue}</TableCell>
                                    <TableCell className="text-right tabular-nums">{totals.followUpsOverdue}</TableCell>
                                    <TableCell className="text-right tabular-nums">{formatCurrency(totals.overdueAmount)}</TableCell>
                                    <TableCell className="border-l text-right tabular-nums">{formatNumber(totals.leadsAssigned)}</TableCell>
                                    <TableCell className="text-right tabular-nums">{formatNumber(totals.dealsWon)}</TableCell>
                                    <TableCell className="text-right tabular-nums">
                                        {percent(totals.leadsAssigned > 0 ? totals.dealsWon / totals.leadsAssigned : 0)}
                                    </TableCell>
                                    <TableCell className="pr-4 text-right tabular-nums">{formatCurrency(totals.revenue)}</TableCell>
                                </TableRow>
                            </TableFooter>
                        </DataTable>
                        <p className="mt-3 text-xs text-muted-foreground">{t("team.legend", {count: days})}</p>
                    </CardContent>
                </Card>
            ) : null}

            <Card className="border border-secondary shadow-none pt-0">
                <CardHeader className="border-b py-4">
                    <CardTitle className="text-sm text-muted-foreground">{t("team.membersHeading")}</CardTitle>
                </CardHeader>
                <CardContent>
                    <DataTable
                        isLoading={members.isLoading}
                        isEmpty={(members.data?.items.length ?? 0) === 0}
                        emptyIcon={<UsersIcon strokeWidth={1.25} />}
                        emptyTitle={t("team.emptyTitle")}
                        emptyDescription={t("team.emptyDescription")}
                    >
                        <TableHeader>
                            <TableRow>
                                <TableHead className="pl-4">{t("table.headers.name")}</TableHead>
                                <TableHead>{t("table.headers.role")}</TableHead>
                                <TableHead>{t("team.columns.phone")}</TableHead>
                                <TableHead className={canHandOver ? undefined : "pr-4"}>{t("table.headers.status")}</TableHead>
                                {canHandOver ? <TableHead className="pr-4"><span className="sr-only">{t("handover.action")}</span></TableHead> : null}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(members.data?.items ?? []).map((member) => (
                                <TableRow key={member.id}>
                                    <TableCell className="pl-4">
                                        <p className="font-medium">{member.fullName}</p>
                                        <a href={`mailto:${member.email}`} className="text-xs text-muted-foreground hover:underline">{member.email}</a>
                                    </TableCell>
                                    <TableCell>{member.role.name}</TableCell>
                                    <TableCell>
                                        {member.phone
                                            ? <a href={`tel:${member.phone}`} className="hover:underline">{member.phone}</a>
                                            : <span className="text-muted-foreground">—</span>}
                                    </TableCell>
                                    <TableCell className={canHandOver ? undefined : "pr-4"}><UserStatusDot isActive={member.isActive} /></TableCell>
                                    {canHandOver ? (
                                        <TableCell className="pr-4 text-right">
                                            {member.id !== user?.id ? (
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => setHandingOver({id: member.id, fullName: member.fullName, branchId: member.branchId ?? null})}
                                                >
                                                    {t("handover.action")}
                                                </Button>
                                            ) : null}
                                        </TableCell>
                                    ) : null}
                                </TableRow>
                            ))}
                        </TableBody>
                    </DataTable>
                </CardContent>
            </Card>

            <HandOverDialog person={handingOver} onClose={() => setHandingOver(null)} />
        </div>
    );
}
