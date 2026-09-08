import {useState} from "react";
import {Link, useNavigate, useParams} from "react-router-dom";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {toast} from "sonner";
import {ArrowLeft, Eye, KeyRound, PauseCircle, PlayCircle} from "lucide-react";
import {useTranslation} from "react-i18next";
import {Badge} from "@/components/ui/badge.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {DataList, DataListItem, DataListItemLabel, DataListItemValue} from "@/components/ui/data-list.tsx";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {Spinner} from "@/components/ui/spinner.tsx";
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
import {Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle} from "@/components/ui/dialog.tsx";
import {USER_ROLE_LABEL_KEYS} from "@/features/users/types/user.types";
import {formatDate} from "@/utils/date-formatter";
import {authStorage} from "@/features/auth/utils/auth-storage";
import {landingPathFor} from "@/features/auth/access";
import {
    deactivateCompanyUser,
    getCompany,
    impersonateCompanyUser,
    reactivateCompanyUser,
    resetCompanyUserPassword,
    type ResetCompanyUserPasswordResult,
} from "../api/companies.api";
import {isSuspended} from "../types/company.types";
import type {CompanyUser} from "../types/company.types";

type PendingUserAction = {action: "deactivate" | "reactivate" | "resetPassword"; user: CompanyUser} | null;

export function CompanyDetailPage() {
    const {companyId} = useParams<{companyId: string}>();
    const {t, i18n} = useTranslation(["companies", "users"]);
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [pending, setPending] = useState<PendingUserAction>(null);
    const [resetResult, setResetResult] = useState<ResetCompanyUserPasswordResult | null>(null);
    const [pendingImpersonate, setPendingImpersonate] = useState<CompanyUser | null>(null);

    const company = useQuery({
        queryKey: ["companies", companyId],
        queryFn: () => getCompany(companyId as string),
        enabled: Boolean(companyId),
    });

    const userAction = useMutation<unknown, Error, NonNullable<PendingUserAction>>({
        mutationFn: ({action, user}: NonNullable<PendingUserAction>) =>
            action === "deactivate"
                ? deactivateCompanyUser(companyId as string, user.id)
                : action === "reactivate"
                  ? reactivateCompanyUser(companyId as string, user.id)
                  : resetCompanyUserPassword(companyId as string, user.id),
        onSuccess: (result, {action, user}) => {
            void queryClient.invalidateQueries({queryKey: ["companies", companyId]});
            setPending(null);

            if (action === "resetPassword") {
                // Held in state, not a toast: shown once, and a toast that
                // auto-dismisses would lose it.
                setResetResult(result as ResetCompanyUserPasswordResult);
            } else {
                toast.success(
                    action === "deactivate"
                        ? t("detail.usersCard.toasts.deactivated", {ns: "companies", name: user.fullName})
                        : t("detail.usersCard.toasts.reactivated", {ns: "companies", name: user.fullName}),
                );
            }
        },
        onError: () => toast.error(t("detail.usersCard.toasts.actionError", {ns: "companies"})),
    });

    const impersonate = useMutation({
        mutationFn: (user: CompanyUser) => impersonateCompanyUser(companyId as string, user.id),
        onSuccess: (result) => {
            const currentToken = authStorage.getToken();
            if (currentToken) authStorage.stashImpersonatorToken(currentToken);

            authStorage.setToken(result.accessToken);
            void queryClient.invalidateQueries({queryKey: ["auth", "me"]});
            setPendingImpersonate(null);
            navigate(landingPathFor(result.user.role));
        },
        onError: () => toast.error(t("detail.usersCard.toasts.actionError", {ns: "companies"})),
    });

    if (company.isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Spinner />
            </div>
        );
    }

    if (!company.data) {
        return <p className="text-muted-foreground">{t("detail.notFound", {ns: "companies"})}</p>;
    }

    const data = company.data;
    const suspended = isSuspended(data);

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                    <Button asChild size="sm" variant="ghost" className="-ml-2">
                        <Link to="/companies">
                            <ArrowLeft className="size-4" />
                            {t("detail.backToCompanies", {ns: "companies"})}
                        </Link>
                    </Button>
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-medium tracking-tight">{data.name}</h2>
                        <Badge variant={suspended ? "destructive" : "secondary"}>
                            {suspended
                                ? t("status.suspended", {ns: "companies"})
                                : t("status.active", {ns: "companies"})}
                        </Badge>
                    </div>
                </div>
            </div>

            {suspended ? (
                <Card className="border-destructive/40">
                    <CardContent className="py-4 text-sm">
                        {t("detail.suspendedBanner", {
                            ns: "companies",
                            date: formatDate(data.suspendedAt as string, i18n.language).date,
                        })}
                    </CardContent>
                </Card>
            ) : null}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label={t("detail.stats.projects", {ns: "companies"})} value={data.stats.projects} />
                <Stat label={t("detail.stats.units", {ns: "companies"})} value={data.stats.units} />
                <Stat label={t("detail.stats.clients", {ns: "companies"})} value={data.stats.clients} />
                <Stat label={t("detail.stats.leads", {ns: "companies"})} value={data.stats.leads} />
                <Stat label={t("detail.stats.deals", {ns: "companies"})} value={data.stats.deals} />
                <Stat
                    label={t("detail.stats.activeDeals", {ns: "companies"})}
                    value={data.stats.activeDeals}
                    hint={t("detail.stats.activeDealsHint", {ns: "companies"})}
                />
                <Stat label={t("detail.stats.users", {ns: "companies"})} value={data.stats.users} />
                <Stat
                    label={t("detail.stats.activeUsers", {ns: "companies"})}
                    value={data.stats.activeUsers}
                />
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
                <Card className="border-secondary shadow-none">
                    <CardHeader>
                        <CardTitle>{t("detail.settings.title", {ns: "companies"})}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <DataList className="divide-y">
                            <Row label={t("detail.settings.currency", {ns: "companies"})} value={data.currency} />
                            <Row label={t("detail.settings.locale", {ns: "companies"})} value={data.locale} />
                            <Row label={t("detail.settings.timezone", {ns: "companies"})} value={data.timezone} />
                            <Row label={t("detail.settings.phone", {ns: "companies"})} value={data.phone} />
                            <Row label={t("detail.settings.address", {ns: "companies"})} value={data.address} />
                            <Row
                                label={t("detail.settings.created", {ns: "companies"})}
                                value={formatDate(data.createdAt, i18n.language).date}
                            />
                        </DataList>
                    </CardContent>
                </Card>

                <Card className="border-secondary shadow-none">
                    <CardHeader>
                        <CardTitle>{t("detail.usersCard.title", {ns: "companies"})}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data.users.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                                {t("detail.usersCard.empty", {ns: "companies"})}
                            </p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>
                                            {t("detail.usersCard.headers.name", {ns: "companies"})}
                                        </TableHead>
                                        <TableHead>
                                            {t("detail.usersCard.headers.role", {ns: "companies"})}
                                        </TableHead>
                                        <TableHead>
                                            {t("detail.usersCard.headers.status", {ns: "companies"})}
                                        </TableHead>
                                        <TableHead className="w-0" />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.users.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell>
                                                <div className="font-medium">{user.fullName}</div>
                                                <div className="text-muted-foreground text-xs">{user.email}</div>
                                            </TableCell>
                                            <TableCell>
                                                {t(USER_ROLE_LABEL_KEYS[user.role])}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={user.isActive ? "secondary" : "outline"}>
                                                    {user.isActive
                                                        ? t("status.active", {ns: "users"})
                                                        : t("status.inactive", {ns: "users"})}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex justify-end gap-1">
                                                    {user.isActive ? (
                                                        <Button
                                                            size="icon-sm"
                                                            variant="ghost"
                                                            aria-label={t("detail.usersCard.rowActions.impersonate", {
                                                                ns: "companies",
                                                                name: user.fullName,
                                                            })}
                                                            onClick={() => setPendingImpersonate(user)}
                                                        >
                                                            <Eye className="size-3.5" />
                                                        </Button>
                                                    ) : null}
                                                    <Button
                                                        size="icon-sm"
                                                        variant="ghost"
                                                        aria-label={
                                                            user.isActive
                                                                ? t("detail.usersCard.rowActions.deactivate", {
                                                                      ns: "companies",
                                                                      name: user.fullName,
                                                                  })
                                                                : t("detail.usersCard.rowActions.reactivate", {
                                                                      ns: "companies",
                                                                      name: user.fullName,
                                                                  })
                                                        }
                                                        onClick={() =>
                                                            setPending({
                                                                action: user.isActive ? "deactivate" : "reactivate",
                                                                user,
                                                            })
                                                        }
                                                    >
                                                        {user.isActive ? (
                                                            <PauseCircle className="size-3.5" />
                                                        ) : (
                                                            <PlayCircle className="size-3.5" />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        size="icon-sm"
                                                        variant="ghost"
                                                        aria-label={t("detail.usersCard.rowActions.resetPassword", {
                                                            ns: "companies",
                                                            name: user.fullName,
                                                        })}
                                                        onClick={() => setPending({action: "resetPassword", user})}
                                                    >
                                                        <KeyRound className="size-3.5" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>

            <UserActionConfirmDialog
                pending={pending}
                isPending={userAction.isPending}
                onCancel={() => setPending(null)}
                onConfirm={() => pending && userAction.mutate(pending)}
            />

            <ResetPasswordResultDialog result={resetResult} onClose={() => setResetResult(null)} />

            <ImpersonateConfirmDialog
                user={pendingImpersonate}
                isPending={impersonate.isPending}
                onCancel={() => setPendingImpersonate(null)}
                onConfirm={() => pendingImpersonate && impersonate.mutate(pendingImpersonate)}
            />
        </div>
    );
}

function Stat({label, value, hint}: {label: string; value: number; hint?: string}) {
    return (
        <Card className="border-secondary shadow-none">
            <CardContent className="py-4">
                <div className="text-2xl font-medium tabular-nums">{value}</div>
                <div className="text-muted-foreground mt-1 text-xs">{label}</div>
                {hint ? <div className="text-muted-foreground/70 mt-0.5 text-[11px]">{hint}</div> : null}
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

function useUserActionCopy() {
    const {t} = useTranslation("companies");
    return {
        deactivate: {
            title: t("detail.usersCard.confirmDialog.deactivate.title"),
            body: t("detail.usersCard.confirmDialog.deactivate.body"),
            confirm: t("detail.usersCard.confirmDialog.deactivate.confirm"),
        },
        reactivate: {
            title: t("detail.usersCard.confirmDialog.reactivate.title"),
            body: t("detail.usersCard.confirmDialog.reactivate.body"),
            confirm: t("detail.usersCard.confirmDialog.reactivate.confirm"),
        },
        resetPassword: {
            title: t("detail.usersCard.confirmDialog.resetPassword.title"),
            body: t("detail.usersCard.confirmDialog.resetPassword.body"),
            confirm: t("detail.usersCard.confirmDialog.resetPassword.confirm"),
        },
    } as const;
}

function UserActionConfirmDialog({
    pending,
    isPending,
    onCancel,
    onConfirm,
}: {
    pending: PendingUserAction;
    isPending: boolean;
    onCancel(): void;
    onConfirm(): void;
}) {
    const {t} = useTranslation("companies");
    const {t: tCommon} = useTranslation("common");
    const COPY = useUserActionCopy();
    const copy = pending ? COPY[pending.action] : null;

    return (
        <AlertDialog open={pending !== null} onOpenChange={({open}) => !open && onCancel()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{copy?.title}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {pending ? (
                            <>
                                <span className="font-medium">{pending.user.fullName}</span> — {copy?.body}
                            </>
                        ) : null}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPending}>{tCommon("actions.cancel")}</AlertDialogCancel>
                    <AlertDialogAction disabled={isPending} onClick={onConfirm}>
                        {isPending ? t("confirmDialog.working") : copy?.confirm}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

function ResetPasswordResultDialog({
    result,
    onClose,
}: {
    result: ResetCompanyUserPasswordResult | null;
    onClose(): void;
}) {
    const {t} = useTranslation("companies");

    return (
        <Dialog open={result !== null} onOpenChange={({open}) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t("detail.usersCard.resetResult.title")}</DialogTitle>
                </DialogHeader>
                <DialogBody className="space-y-3 text-sm">
                    <p>
                        {t("detail.usersCard.resetResult.email")}{" "}
                        <span className="font-medium">{result?.email}</span>
                    </p>
                    <div className="space-y-1">
                        <p className="text-muted-foreground">{t("detail.usersCard.resetResult.passwordLabel")}</p>
                        <code className="bg-muted block rounded px-3 py-2 font-mono text-base">
                            {result?.generatedPassword}
                        </code>
                        <p className="text-muted-foreground">{t("detail.usersCard.resetResult.passwordHint")}</p>
                    </div>
                </DialogBody>
                <DialogFooter>
                    <Button onClick={onClose}>{t("detail.usersCard.resetResult.confirm")}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function ImpersonateConfirmDialog({
    user,
    isPending,
    onCancel,
    onConfirm,
}: {
    user: CompanyUser | null;
    isPending: boolean;
    onCancel(): void;
    onConfirm(): void;
}) {
    const {t} = useTranslation("companies");
    const {t: tCommon} = useTranslation("common");

    return (
        <AlertDialog open={user !== null} onOpenChange={({open}) => !open && onCancel()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t("detail.usersCard.confirmDialog.impersonate.title")}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {user ? (
                            <>
                                <span className="font-medium">{user.fullName}</span> —{" "}
                                {t("detail.usersCard.confirmDialog.impersonate.body")}
                            </>
                        ) : null}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPending}>{tCommon("actions.cancel")}</AlertDialogCancel>
                    <AlertDialogAction disabled={isPending} onClick={onConfirm}>
                        {isPending
                            ? t("confirmDialog.working")
                            : t("detail.usersCard.confirmDialog.impersonate.confirm")}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
