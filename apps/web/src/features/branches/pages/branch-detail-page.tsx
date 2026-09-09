import {useState} from "react";
import {Link, useParams} from "react-router-dom";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {toast} from "sonner";
import {useTranslation} from "react-i18next";
import {ArrowLeft, PauseCircle, Pencil, PlayCircle, Users} from "lucide-react";
import {Badge} from "@/components/ui/badge.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {DataList, DataListItem, DataListItemLabel, DataListItemValue} from "@/components/ui/data-list.tsx";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {Spinner} from "@/components/ui/spinner.tsx";
import {Empty, EmptyHeader, EmptyMedia, EmptyTitle} from "@/components/ui/empty.tsx";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import {USER_ROLE_LABEL_KEYS} from "@/features/users/types/user.types";
import {formatDate} from "@/utils/date-formatter";
import {paths} from "@/routes/paths";
import {
    type CreateBranchPayload,
    deactivateBranch,
    getBranch,
    reactivateBranch,
    updateBranch,
} from "../api/branches.api";
import {type Branch, BRANCH_STATUS_BADGE_CLASSES, isDeactivated} from "../types/branch.types";
import {BranchFormSheet} from "../components/branch-form-sheet";

type PendingAction = "deactivate" | "reactivate" | null;

export function BranchDetailPage() {
    const {branchId} = useParams<{branchId: string}>();
    const {t, i18n} = useTranslation(["branches", "users"]);
    const {t: tCommon} = useTranslation("common");
    const queryClient = useQueryClient();
    const [formOpen, setFormOpen] = useState(false);
    const [pending, setPending] = useState<PendingAction>(null);

    const branch = useQuery({
        queryKey: ["branches", branchId],
        queryFn: () => getBranch(branchId as string),
        enabled: Boolean(branchId),
    });

    const refresh = () => queryClient.invalidateQueries({queryKey: ["branches", branchId]});

    const save = useMutation<Branch, Error, CreateBranchPayload>({
        mutationFn: (payload) => updateBranch(branchId as string, payload),
        onSuccess: () => {
            void refresh();
            setFormOpen(false);
            toast.success(t("page.toasts.updateSuccess"));
        },
        onError: (error: Error & {response?: {data?: {message?: string}}}) =>
            toast.error(error.response?.data?.message ?? t("page.toasts.updateError")),
    });

    const act = useMutation<unknown, Error & {response?: {data?: {message?: string}}}, NonNullable<PendingAction>>({
        mutationFn: (action) =>
            action === "deactivate" ? deactivateBranch(branchId as string) : reactivateBranch(branchId as string),
        onSuccess: () => {
            void refresh();
            setPending(null);
            toast.success(
                pending === "deactivate" ? t("page.toasts.deactivated", {name: branch.data?.name}) : t("page.toasts.reactivated", {name: branch.data?.name}),
            );
        },
        onError: (error) => {
            toast.error(error.response?.data?.message ?? t("page.toasts.actionError"));
            setPending(null);
        },
    });

    if (branch.isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Spinner />
            </div>
        );
    }

    if (!branch.data) {
        return <p className="text-muted-foreground">{t("detail.notFound")}</p>;
    }

    const data = branch.data;
    const deactivated = isDeactivated(data);

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-medium tracking-tight">{data.name}</h2>
                        <Badge variant="default" className={BRANCH_STATUS_BADGE_CLASSES[deactivated ? 1 : 0]}>
                            {deactivated ? t("status.deactivated") : t("status.active")}
                        </Badge>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button asChild variant="ghost">
                        <Link to={paths.branches.root}>
                            <ArrowLeft className="size-3"/> {t("common:actions.back")}
                        </Link>
                    </Button>
                    <Button variant="default" onClick={() => setFormOpen(true)}>
                        <Pencil className="size-3.5" />
                        {t("detail.edit")}
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={() => setPending(deactivated ? "reactivate" : "deactivate")}
                    >
                        {deactivated ? <PlayCircle className="size-3.5" /> : <PauseCircle className="size-3.5" />}
                        {deactivated ? t("detail.reactivate") : t("detail.deactivate")}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label={t("detail.stats.users")} value={data.stats.users} />
                <Stat label={t("detail.stats.activeUsers")} value={data.stats.activeUsers} />
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
                <Card className="border-secondary shadow-none">
                    <CardHeader>
                        <CardTitle>{t("detail.settings.title")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <DataList className="divide-y">
                            <Row label={t("detail.settings.city")} value={data.city} />
                            <Row label={t("detail.settings.address")} value={data.address} />
                            <Row label={t("detail.settings.phone")} value={data.phone} />
                            <Row
                                label={t("detail.settings.created")}
                                value={formatDate(data.createdAt, i18n.language).date}
                            />
                        </DataList>
                    </CardContent>
                </Card>

                <Card className="border-secondary shadow-none">
                    <CardHeader>
                        <CardTitle>{t("detail.usersCard.title")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data.users.length === 0 ? (
                            <Empty>
                                <EmptyHeader>
                                    <EmptyMedia variant="icon">
                                        <Users strokeWidth={1.25} />
                                    </EmptyMedia>
                                    <EmptyTitle>{t("detail.usersCard.empty")}</EmptyTitle>
                                    {/*<EmptyDescription>{t("detail.usersCard.emptyDescription")}</EmptyDescription>*/}
                                </EmptyHeader>
                            </Empty>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t("detail.usersCard.headers.name")}</TableHead>
                                        <TableHead>{t("detail.usersCard.headers.role")}</TableHead>
                                        <TableHead>{t("detail.usersCard.headers.status")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.users.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell>
                                                <div className="font-medium">{user.fullName}</div>
                                                <div className="text-muted-foreground text-xs">{user.email}</div>
                                            </TableCell>
                                            <TableCell>{t(USER_ROLE_LABEL_KEYS[user.role])}</TableCell>
                                            <TableCell>
                                                <Badge variant={user.isActive ? "secondary" : "outline"}>
                                                    {user.isActive
                                                        ? t("status.active", {ns: "users"})
                                                        : t("status.inactive", {ns: "users"})}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>

            <BranchFormSheet
                open={formOpen}
                branch={data}
                isSubmitting={save.isPending}
                onOpenChange={setFormOpen}
                onSubmit={(payload) => save.mutate(payload)}
            />

            <AlertDialog open={pending !== null} onOpenChange={({open}) => !open && setPending(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {pending === "deactivate"
                                ? t("page.confirmDialog.deactivate.title")
                                : t("page.confirmDialog.reactivate.title")}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            <span className="font-medium">{data.name}</span> —{" "}
                            {pending === "deactivate"
                                ? t("page.confirmDialog.deactivate.body")
                                : t("page.confirmDialog.reactivate.body")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={act.isPending}>{tCommon("actions.cancel")}</AlertDialogCancel>
                        <AlertDialogAction disabled={act.isPending} onClick={() => pending && act.mutate(pending)}>
                            {act.isPending
                                ? t("page.confirmDialog.working")
                                : pending === "deactivate"
                                  ? t("page.confirmDialog.deactivate.confirm")
                                  : t("page.confirmDialog.reactivate.confirm")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function Stat({label, value}: {label: string; value: number}) {
    return (
        <Card className="border-secondary shadow-none">
            <CardContent className="py-4">
                <div className="text-2xl font-medium tabular-nums">{value}</div>
                <div className="text-muted-foreground mt-1 text-xs">{label}</div>
            </CardContent>
        </Card>
    );
}

function Row({label, value}: {label: string; value: string | null}) {
    return (
        <DataListItem className="justify-between py-2">
            <DataListItemLabel>{label}</DataListItemLabel>
            <DataListItemValue className="flex-none">{value || "—"}</DataListItemValue>
        </DataListItem>
    );
}
