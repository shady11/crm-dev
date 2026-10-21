import {useState} from "react";
import {Link} from "react-router-dom";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
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
import {createCompany, type CreateCompanyPayload, type CreateCompanyResult, getCompanies} from "../api/companies.api";
import {isSuspended} from "../types/company.types";
import {CompanyFormSheet} from "../components/company-form-sheet";
import {GeneratedPassword} from "../components/generated-password";
import {useCompanyActions} from "../hooks/use-company-actions";
import {companyFormError} from "../utils/company-form-error";

/** SA-3: the live companies, or the deleted ones (to restore). */
type View = "current" | "deleted";

export function CompaniesPage() {
    const {t, i18n} = useTranslation("companies");
    const queryClient = useQueryClient();
    const [view, setView] = useState<View>("current");
    const [search, setSearch] = useState("");
    const [formOpen, setFormOpen] = useState(false);
    const [created, setCreated] = useState<CreateCompanyResult | null>(null);
    const actions = useCompanyActions();

    const companies = useQuery({
        queryKey: ["companies", search, view],
        queryFn: () =>
            getCompanies({
                ...(search ? {search} : {}),
                ...(view === "deleted" ? {status: "deleted" as const} : {}),
            }),
    });

    const refresh = () => queryClient.invalidateQueries({queryKey: ["companies"]});

    const save = useMutation<CreateCompanyResult, Error, CreateCompanyPayload>({
        mutationFn: createCompany,
        onSuccess: (result) => {
            void refresh();
            setFormOpen(false);
            // Held in state, not a toast: the generated password is shown
            // once and a toast that auto-dismisses would lose it.
            setCreated(result);
        },
    });

    // SA-4: the API says why (email or name taken, password too short);
    // the form shows it next to the fields instead of a generic toast.
    const formError = save.error ? companyFormError(save.error, t, false) : undefined;

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
                    <Button onClick={() => setFormOpen(true)}>
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
                        {/* SA-12: "I have saved it" only when there was something to save. */}
                        <Button variant="secondary" size="sm" onClick={() => setCreated(null)}>
                            {created.admin.generatedPassword ? t("page.created.confirm") : t("page.created.dismiss")}
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
                                                        onClick={() => actions.request("restore", company)}
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
                                                    onClick={() => actions.request("edit", company)}
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
                                                    onClick={() => actions.request(suspended ? "resume" : "suspend", company)}
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
                                                    onClick={() => actions.request("delete", company)}
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
                company={null}
                isSubmitting={save.isPending}
                formError={formError}
                onOpenChange={(open) => {
                    setFormOpen(open);
                    // The next time the form opens, it starts without the old error.
                    if (!open) save.reset();
                }}
                onSubmit={(payload) => save.mutate(payload)}
            />

            {actions.dialogs}
        </div>
    );
}
