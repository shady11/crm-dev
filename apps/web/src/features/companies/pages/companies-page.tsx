import {useState} from "react";
import {Link} from "react-router-dom";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {isAxiosError} from "axios";
import type {TFunction} from "i18next";
import {toast} from "@/components/ui/toast.tsx";
import {apiErrorMessage} from "@/lib/api-error.ts";
import {useTranslation} from "react-i18next";
import {Building2, PauseCircle, Pencil, PlayCircle, Plus, RotateCcw, SlidersHorizontal, Trash2} from "lucide-react";
import {Badge} from "@/components/ui/badge.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {Spinner} from "@/components/ui/spinner.tsx";
import {Tabs, TabsList, TabsTrigger} from "@/components/ui/tabs.tsx";
import {formatDate} from "@/utils/date-formatter.ts";
import {Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/components/ui/empty.tsx";
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
import {
    createCompany,
    type CreateCompanyPayload,
    type CreateCompanyResult,
    deleteCompany,
    getCompanies,
    restoreCompany,
    resumeCompany,
    suspendCompany,
    updateCompany,
} from "../api/companies.api";
import type {Company} from "../types/company.types";
import {isSuspended} from "../types/company.types";
import {CompanyFormSheet} from "../components/company-form-sheet";
import {GeneratedPassword} from "../components/generated-password";
import {DeleteCompanyDialog} from "../components/delete-company-dialog";

type Pending = {action: "suspend" | "resume" | "delete" | "restore"; company: Company} | null;

/** SA-3: the live companies, or the deleted ones (to restore). */
type View = "current" | "deleted";

export function CompaniesPage() {
    const {t, i18n} = useTranslation("companies");
    const queryClient = useQueryClient();
    const [view, setView] = useState<View>("current");
    const [search, setSearch] = useState("");
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Company | null>(null);
    const [created, setCreated] = useState<CreateCompanyResult | null>(null);
    const [pending, setPending] = useState<Pending>(null);

    const companies = useQuery({
        queryKey: ["companies", search, view],
        queryFn: () =>
            getCompanies({
                ...(search ? {search} : {}),
                ...(view === "deleted" ? {status: "deleted" as const} : {}),
            }),
    });

    const refresh = () => queryClient.invalidateQueries({queryKey: ["companies"]});

    const save = useMutation<CreateCompanyResult | Company, Error, CreateCompanyPayload>({
        mutationFn: (payload: CreateCompanyPayload) =>
            editing ? updateCompany(editing.id, payload) : createCompany(payload),
        onSuccess: (result) => {
            void refresh();
            setFormOpen(false);

            if (editing) {
                toast.success({title: t("page.toasts.updateSuccess")});
                setEditing(null);
            } else {
                // Held in state, not a toast: the generated password is shown
                // once and a toast that auto-dismisses would lose it.
                setCreated(result as CreateCompanyResult);
            }
        },
    });

    // SA-4: the API says why (email or name taken, password too short);
    // the form shows it next to the fields instead of a generic toast.
    const formError = save.error ? companyFormError(save.error, t, Boolean(editing)) : undefined;

    const act = useMutation<unknown, Error, NonNullable<Pending>>({
        mutationFn: ({action, company}: NonNullable<Pending>) =>
            action === "suspend"
                ? suspendCompany(company.id)
                : action === "resume"
                  ? resumeCompany(company.id)
                  : action === "restore"
                    ? restoreCompany(company.id)
                    : deleteCompany(company.id),
        onSuccess: (_result, {action, company}) => {
            void refresh();
            setPending(null);
            toast.success({
                title: action === "suspend"
                    ? t("page.toasts.suspended", {name: company.name})
                    : action === "resume"
                      ? t("page.toasts.resumed", {name: company.name})
                      : action === "restore"
                        ? t("page.toasts.restored", {name: company.name})
                        : t("page.toasts.deleted", {name: company.name}),
            });
        },
        onError: (error) =>
            toast.error({title: t("page.toasts.actionError"), description: apiErrorMessage(error)}),
    });

    const items = companies.data?.items ?? [];

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{t("page.heading")}</h2>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" asChild>
                        <Link to="/setting-options">
                            <SlidersHorizontal className="size-4" />
                            {t("page.manageSettingOptions")}
                        </Link>
                    </Button>
                    <Button
                        onClick={() => {
                            setEditing(null);
                            setFormOpen(true);
                        }}
                    >
                        <Plus className="size-4" />
                        {t("page.newCompany")}
                    </Button>
                </div>
            </div>

            {created ? (
                <Card className="border-emerald-500/40">
                    <CardHeader>
                        <CardTitle>{t("page.created.title", {name: created.company.name})}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <p>
                            {t("page.created.administrator")}{" "}
                            <span className="font-medium">{created.admin.email}</span>
                        </p>
                        {created.admin.generatedPassword ? (
                            <div className="space-y-1">
                                <p className="text-muted-foreground">
                                    {t("page.created.generatedPasswordLabel")}
                                </p>
                                <GeneratedPassword value={created.admin.generatedPassword} />
                                <p className="text-muted-foreground">
                                    {t("page.created.generatedPasswordHint")}
                                </p>
                            </div>
                        ) : null}
                        <Button variant="secondary" size="sm" onClick={() => setCreated(null)}>
                            {t("page.created.confirm")}
                        </Button>
                    </CardContent>
                </Card>
            ) : null}

            <Tabs value={view} onValueChange={({value}) => setView(value as View)}>
                <TabsList>
                    <TabsTrigger value="current">{t("page.views.current")}</TabsTrigger>
                    <TabsTrigger value="deleted">{t("page.views.deleted")}</TabsTrigger>
                </TabsList>
            </Tabs>

            <Input
                placeholder={t("page.searchPlaceholder")}
                aria-label={t("page.searchPlaceholder")}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="max-w-sm"
            />

            {companies.isLoading ? (
                <div className="flex h-48 items-center justify-center">
                    <Spinner />
                </div>
            ) : items.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <Building2 />
                        </EmptyMedia>
                        <EmptyTitle>{view === "deleted" ? t("page.empty.deletedTitle") : t("page.empty.title")}</EmptyTitle>
                        <EmptyDescription>
                            {view === "deleted" ? t("page.empty.deletedDescription") : t("page.empty.description")}
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("page.table.headers.name")}</TableHead>
                                <TableHead>{t("page.table.headers.status")}</TableHead>
                                <TableHead>{t("page.table.headers.currency")}</TableHead>
                                <TableHead className="text-right">{t("page.table.headers.users")}</TableHead>
                                <TableHead className="text-right">
                                    {t("page.table.headers.projects")}
                                </TableHead>
                                <TableHead className="w-0" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((company) => {
                                const suspended = isSuspended(company);
                                const deleted = Boolean(company.deletedAt);

                                return (
                                    <TableRow key={company.id} className={suspended ? "opacity-60" : undefined}>
                                        <TableCell className="font-medium">
                                            {deleted ? (
                                                company.name
                                            ) : (
                                                <Link className="hover:underline" to={`/companies/${company.id}`}>
                                                    {company.name}
                                                </Link>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {deleted ? (
                                                <Badge variant="outline">
                                                    {t("status.deletedOn", {
                                                        date: formatDate(company.deletedAt!, i18n.language).date,
                                                    })}
                                                </Badge>
                                            ) : (
                                                <Badge variant={suspended ? "destructive" : "secondary"}>
                                                    {suspended ? t("status.suspended") : t("status.active")}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>{company.currency ?? "—"}</TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {company._count?.users ?? 0}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {company._count?.projects ?? 0}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-end gap-1">
                                                {deleted ? (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setPending({action: "restore", company})}
                                                    >
                                                        <RotateCcw className="size-3.5" />
                                                        {t("page.rowActions.restore")}
                                                    </Button>
                                                ) : (
                                                    <>
                                                <Button
                                                    size="icon-sm"
                                                    variant="ghost"
                                                    aria-label={t("page.rowActions.edit", {name: company.name})}
                                                    onClick={() => {
                                                        setEditing(company);
                                                        setFormOpen(true);
                                                    }}
                                                >
                                                    <Pencil className="size-3.5" />
                                                </Button>
                                                <Button
                                                    size="icon-sm"
                                                    variant="ghost"
                                                    aria-label={
                                                        suspended
                                                            ? t("page.rowActions.resume", {name: company.name})
                                                            : t("page.rowActions.suspend", {name: company.name})
                                                    }
                                                    onClick={() =>
                                                        setPending({
                                                            action: suspended ? "resume" : "suspend",
                                                            company,
                                                        })
                                                    }
                                                >
                                                    {suspended ? (
                                                        <PlayCircle className="size-3.5" />
                                                    ) : (
                                                        <PauseCircle className="size-3.5" />
                                                    )}
                                                </Button>
                                                <Button
                                                    size="icon-sm"
                                                    variant="ghost"
                                                    // SA-3: only a suspended company can be deleted.
                                                    disabled={!suspended}
                                                    aria-label={
                                                        suspended
                                                            ? t("page.rowActions.delete", {name: company.name})
                                                            : t("page.rowActions.deleteNeedsSuspend", {name: company.name})
                                                    }
                                                    title={suspended ? undefined : t("page.rowActions.deleteNeedsSuspend", {name: company.name})}
                                                    onClick={() => setPending({action: "delete", company})}
                                                >
                                                    <Trash2 className="text-destructive size-3.5" />
                                                </Button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}

            <CompanyFormSheet
                open={formOpen}
                company={editing}
                isSubmitting={save.isPending}
                formError={formError}
                onOpenChange={(open) => {
                    setFormOpen(open);
                    if (!open) {
                        setEditing(null);
                        // The next time the form opens, it starts without the old error.
                        save.reset();
                    }
                }}
                onSubmit={(payload) => save.mutate(payload)}
            />

            <DeleteCompanyDialog
                company={pending?.action === "delete" ? pending.company : null}
                isPending={act.isPending}
                onCancel={() => setPending(null)}
                onConfirm={() => pending && act.mutate(pending)}
            />

            <ConfirmDialog
                pending={pending?.action === "delete" ? null : pending}
                isPending={act.isPending}
                onCancel={() => setPending(null)}
                onConfirm={() => pending && act.mutate(pending)}
            />
        </div>
    );
}

// Built inside the component (not at module scope) so its labels re-render
// in the active language rather than freezing in whatever language was
// active when the module first loaded.
function useConfirmCopy() {
    const {t} = useTranslation("companies");
    return {
        suspend: {
            title: t("confirmDialog.suspend.title"),
            body: t("confirmDialog.suspend.body"),
            confirm: t("confirmDialog.suspend.confirm"),
        },
        resume: {
            title: t("confirmDialog.resume.title"),
            body: t("confirmDialog.resume.body"),
            confirm: t("confirmDialog.resume.confirm"),
        },
        delete: {
            title: t("confirmDialog.delete.title"),
            body: t("confirmDialog.delete.body"),
            confirm: t("confirmDialog.delete.confirm"),
        },
        restore: {
            title: t("confirmDialog.restore.title"),
            body: t("confirmDialog.restore.body"),
            confirm: t("confirmDialog.restore.confirm"),
        },
    } as const;
}

function ConfirmDialog({
    pending,
    isPending,
    onCancel,
    onConfirm,
}: {
    pending: Pending;
    isPending: boolean;
    onCancel(): void;
    onConfirm(): void;
}) {
    const {t} = useTranslation("companies");
    const {t: tCommon} = useTranslation("common");
    const COPY = useConfirmCopy();
    const copy = pending ? COPY[pending.action] : null;

    return (
        <AlertDialog open={pending !== null} onOpenChange={({open}) => !open && onCancel()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{copy?.title}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {pending ? (
                            <>
                                <span className="font-medium">{pending.company.name}</span> — {copy?.body}
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

/**
 * SA-4: what the company form says when saving fails. The two conflicts the
 * API can report are translated; anything else is shown as the API says it.
 */
function companyFormError(error: Error, t: TFunction<"companies">, isEdit: boolean): string {
    const message = apiErrorMessage(error);
    if (isAxiosError<{code?: string; companyName?: string}>(error) && error.response?.data?.code === "EMAIL_IN_DELETED_COMPANY") {
        return t("form.errors.emailInDeletedCompany", {name: error.response.data.companyName ?? ""});
    }
    if (isAxiosError(error) && error.response?.status === 409) {
        if (message?.includes("email")) return t("form.errors.emailTaken");
        if (message?.includes("name")) return t("form.errors.nameTaken");
    }
    return message ?? (isEdit ? t("page.toasts.updateError") : t("page.toasts.createError"));
}
