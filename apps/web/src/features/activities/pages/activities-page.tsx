import {useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {createListCollection} from "@ark-ui/react";
import {History} from "lucide-react";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {Spinner} from "@/components/ui/spinner.tsx";
import {Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/components/ui/empty.tsx";
import {Pagination, PaginationItems, PaginationNext, PaginationPrevious} from "@/components/ui/pagination.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {Input} from "@/components/ui/input.tsx";
import {formatDate} from "@/utils/date-formatter";
import {useAuth} from "@/features/auth/hooks/use-auth";
import {UserRole} from "@/features/users/types/user.types";
import {getBranches} from "@/features/branches/api/branches.api";
import {getActivities} from "../api/activities.api";

// Company-wide activity feed. COMPANY_ADMIN sees every company user's
// activity; SALES_HEAD/SALES_MANAGER only see their own branch's — the
// branch filter below is admin-only (BR-B3-style narrowing), mirroring the
// same pattern used on the leads and clients list pages. The server enforces
// this regardless of what's sent from here.
export function ActivitiesPage() {
    const {t, i18n} = useTranslation("activities");
    const {user} = useAuth();
    const isCompanyAdmin = user?.role === UserRole.COMPANY_ADMIN;

    const [branchId, setBranchId] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [page, setPage] = useState(1);
    const limit = 20;

    const branchesQuery = useQuery({
        queryKey: ["branches", "all"],
        queryFn: () => getBranches({limit: 100}),
        enabled: isCompanyAdmin,
    });

    const activitiesQuery = useQuery({
        queryKey: ["activities", {branchId, dateFrom, dateTo, page}],
        queryFn: () =>
            getActivities({
                branchId: isCompanyAdmin && branchId ? branchId : undefined,
                dateFrom: dateFrom || undefined,
                dateTo: dateTo || undefined,
                page,
                limit,
            }),
    });

    const branchCollection = createListCollection({
        items: [
            {label: t("page.filters.allBranches"), value: "ALL"},
            ...(branchesQuery.data?.items ?? []).map((branch) => ({label: branch.name, value: branch.id})),
        ],
    });

    const items = activitiesQuery.data?.items ?? [];
    const total = activitiesQuery.data?.meta.total ?? 0;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-medium tracking-tight">{t("page.heading")}</h2>
                <p className="text-muted-foreground text-sm">
                    {isCompanyAdmin ? t("page.descriptionCompanyAdmin") : t("page.descriptionBranchScoped")}
                </p>
            </div>

            <div className="flex flex-wrap items-end gap-3">
                {isCompanyAdmin ? (
                    <label className="block space-y-1.5">
                        <span className="text-sm font-medium">{t("page.filters.branch")}</span>
                        <Select
                            collection={branchCollection}
                            value={[branchId || "ALL"]}
                            onValueChange={(item) => {
                                setBranchId(item.value[0] === "ALL" ? "" : item.value[0]);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-64">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {branchCollection.items.map((item) => (
                                    <SelectItem key={item.value} item={item}>
                                        {item.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </label>
                ) : null}

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

            {activitiesQuery.isLoading ? (
                <div className="flex h-48 items-center justify-center">
                    <Spinner />
                </div>
            ) : items.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <History />
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
                                <TableHead>{t("page.table.headers.user")}</TableHead>
                                <TableHead>{t("page.table.headers.activity")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((activity) => {
                                const {date, time} = formatDate(activity.createdAt, i18n.language);

                                return (
                                    <TableRow key={activity.id}>
                                        <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                                            {date} {time}
                                        </TableCell>
                                        <TableCell>{activity.user?.fullName ?? t("page.system")}</TableCell>
                                        <TableCell>
                                            <p className="font-medium">{activity.title}</p>
                                            {activity.description ? (
                                                <p className="text-muted-foreground text-xs">
                                                    {activity.description}
                                                </p>
                                            ) : null}
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
