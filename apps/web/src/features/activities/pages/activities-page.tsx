import {useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {createListCollection} from "@ark-ui/react";
import {History, UserRoundIcon} from "lucide-react";
import {Toggle} from "@/components/ui/toggle.tsx";
import {DateField} from "@/components/shared/date-field.tsx";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {Spinner} from "@/components/ui/spinner.tsx";
import {Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/components/ui/empty.tsx";
import {Pagination, PaginationItems, PaginationNext, PaginationPrevious} from "@/components/ui/pagination.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {formatDate} from "@/utils/date-formatter";
import {useAuth} from "@/features/auth/hooks/use-auth";
import {getBranches} from "@/features/branches/api/branches.api";
import {getActivities} from "../api/activities.api";
import {ActivitySubjects} from "../components/activity-subjects";
import {ACTIVITY_SUBJECTS, type ActivitySubject} from "../types/activity.types";

// Company-wide activity feed. A company-wide (non-branch-scoped) role sees
// every company user's activity; a branch-scoped role only sees their own
// branch's — the branch filter below is admin-only (BR-B3-style narrowing),
// mirroring the same pattern used on the leads and clients list pages. The
// server enforces this regardless of what's sent from here.
export function ActivitiesPage() {
    const {t, i18n} = useTranslation("activities");
    const {user} = useAuth();
    const isCompanyWide = !!user && !user.isBranchScoped;

    const [branchId, setBranchId] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [mineOnly, setMineOnly] = useState(false);
    const [subject, setSubject] = useState<ActivitySubject | "">("");
    const [page, setPage] = useState(1);
    const limit = 20;

    const branchesQuery = useQuery({
        queryKey: ["branches", "all"],
        queryFn: () => getBranches({limit: 100}),
        enabled: isCompanyWide,
    });

    const activitiesQuery = useQuery({
        queryKey: ["activities", {branchId, dateFrom, dateTo, mineOnly, subject, page}],
        queryFn: () =>
            getActivities({
                branchId: isCompanyWide && branchId ? branchId : undefined,
                dateFrom: dateFrom || undefined,
                dateTo: dateTo || undefined,
                userId: mineOnly ? user?.id : undefined,
                subject: subject || undefined,
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

    const subjectCollection = createListCollection({
        items: [
            {label: t("page.filters.anything"), value: "ALL"},
            ...ACTIVITY_SUBJECTS.map((value) => ({label: t(`page.filters.subjects.${value}`), value})),
        ],
    });

    const items = activitiesQuery.data?.items ?? [];
    const total = activitiesQuery.data?.meta.total ?? 0;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">{t("page.heading")}</h2>
                <p className="text-muted-foreground text-sm">
                    {isCompanyWide ? t("page.descriptionCompanyAdmin") : t("page.descriptionBranchScoped")}
                </p>
            </div>

            <div className="flex flex-wrap items-end gap-3">
                {isCompanyWide ? (
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
                    <span className="text-sm font-medium">{t("page.filters.subject")}</span>
                    <Select
                        collection={subjectCollection}
                        value={[subject || "ALL"]}
                        onValueChange={(item) => {
                            setSubject(item.value[0] === "ALL" ? "" : (item.value[0] as ActivitySubject));
                            setPage(1);
                        }}
                    >
                        <SelectTrigger className="w-44">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {subjectCollection.items.map((item) => (
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

                <Toggle
                    variant="outline"
                    size="lg"
                    pressed={mineOnly}
                    onPressedChange={(pressed) => {
                        setMineOnly(pressed);
                        setPage(1);
                    }}
                >
                    <UserRoundIcon className="size-4" />
                    {t("page.filters.mineOnly")}
                </Toggle>
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
                <>
                    {/* Phones: one stacked card per row, the activity first. */}
                    <div className="flex flex-col divide-y rounded-lg border md:hidden">
                        {items.map((activity) => {
                            const {date, time} = formatDate(activity.createdAt, i18n.language);
                            return (
                                <div key={activity.id} className="p-3 text-sm">
                                    <p className="font-medium">{activity.title}</p>
                                    {activity.description ? (
                                        <p className="text-muted-foreground text-xs">{activity.description}</p>
                                    ) : null}
                                    <ActivitySubjects activity={activity} />
                                    <p className="text-muted-foreground mt-1.5 text-xs">
                                        {activity.user?.fullName ?? t("page.system")} · {date} {time}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                    <div className="hidden rounded-lg border md:block">
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
                                                <ActivitySubjects activity={activity} />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </>
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
