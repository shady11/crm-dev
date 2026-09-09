import {useState} from "react";
import {Link} from "react-router-dom";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {toast} from "sonner";
import {useTranslation} from "react-i18next";
import {Building2, Plus} from "lucide-react";
import {Badge} from "@/components/ui/badge.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {Separator} from "@/components/ui/separator.tsx";
import {Spinner} from "@/components/ui/spinner.tsx";
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
    type CreateBranchPayload,
    deactivateBranch,
    createBranch,
    getBranches,
    reactivateBranch,
    updateBranch,
} from "../api/branches.api";
import type {Branch} from "../types/branch.types";
import {isDeactivated} from "../types/branch.types";
import {BranchFormSheet} from "../components/branch-form-sheet";
import {paths} from "@/routes/paths";

type Pending = {action: "deactivate" | "reactivate"; branch: Branch} | null;

export function BranchesPage() {
    const {t} = useTranslation("branches");
    const {t: tCommon} = useTranslation("common");
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Branch | null>(null);
    const [pending, setPending] = useState<Pending>(null);

    const branches = useQuery({
        queryKey: ["branches", search],
        queryFn: () => getBranches({search: search || undefined, includeDeactivated: true}),
    });

    const refresh = () => queryClient.invalidateQueries({queryKey: ["branches"]});

    const save = useMutation<Branch, Error, CreateBranchPayload>({
        mutationFn: (payload) => (editing ? updateBranch(editing.id, payload) : createBranch(payload)),
        onSuccess: () => {
            void refresh();
            setFormOpen(false);
            toast.success(editing ? t("page.toasts.updateSuccess") : t("page.toasts.createSuccess"));
            setEditing(null);
        },
        onError: (error: Error & {response?: {data?: {message?: string}}}) =>
            toast.error(error.response?.data?.message ?? (editing ? t("page.toasts.updateError") : t("page.toasts.createError"))),
    });

    const act = useMutation<unknown, Error & {response?: {data?: {message?: string}}}, NonNullable<Pending>>({
        mutationFn: ({action, branch}) =>
            action === "deactivate" ? deactivateBranch(branch.id) : reactivateBranch(branch.id),
        onSuccess: (_result, {action, branch}) => {
            void refresh();
            setPending(null);
            toast.success(
                action === "deactivate"
                    ? t("page.toasts.deactivated", {name: branch.name})
                    : t("page.toasts.reactivated", {name: branch.name}),
            );
        },
        onError: (error) => {
            toast.error(error.response?.data?.message ?? t("page.toasts.actionError"));
            setPending(null);
        },
    });

    const items = branches.data?.items ?? [];

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-medium tracking-tight">{t("page.heading")}</h2>
                    <p className="text-sm text-muted-foreground">{t("page.description")}</p>
                </div>
                <Button
                    onClick={() => {
                        setEditing(null);
                        setFormOpen(true);
                    }}
                >
                    <Plus className="size-4" />
                    {t("page.newBranch")}
                </Button>
            </div>

            <Input
                placeholder={t("page.searchPlaceholder")}
                aria-label={t("page.searchPlaceholder")}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="max-w-sm"
            />

            {branches.isLoading ? (
                <div className="flex h-48 items-center justify-center">
                    <Spinner />
                </div>
            ) : items.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <Building2 />
                        </EmptyMedia>
                        <EmptyTitle>{t("page.empty.title")}</EmptyTitle>
                        <EmptyDescription>{t("page.empty.description")}</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {items.map((branch) => {
                        const deactivated = isDeactivated(branch);
                        const hasDetails = branch.address || branch.city || branch.phone;

                        return (
                            <Card key={branch.id} className={deactivated ? "opacity-60" : undefined}>
                                <CardHeader>
                                    <CardTitle>{branch.name}</CardTitle>
                                    <CardAction>
                                        <Badge variant={deactivated ? "destructive" : "secondary"}>
                                            {deactivated ? t("status.deactivated") : t("status.active")}
                                        </Badge>
                                    </CardAction>
                                </CardHeader>

                                <Separator />

                                <CardContent className="space-y-1 text-sm">
                                    {branch.address ? <p>{branch.address}</p> : null}
                                    {branch.city ? <p>{branch.city}</p> : null}
                                    {branch.phone ? (
                                        <p>
                                            {t("page.card.phoneLabel")}: {branch.phone}
                                        </p>
                                    ) : null}
                                    {!hasDetails ? (
                                        <p className="text-muted-foreground">{t("page.card.noDetails")}</p>
                                    ) : null}
                                </CardContent>

                                <CardFooter className="flex-wrap gap-2 bg-transparent">
                                    <div className="flex flex-wrap gap-3">
                                        <Button
                                            variant="link"
                                            size="sm"
                                            className="h-auto p-0"
                                            onClick={() => {
                                                setEditing(branch);
                                                setFormOpen(true);
                                            }}
                                        >
                                            {t("page.card.edit")}
                                        </Button>
                                        <Button
                                            variant="link"
                                            size="sm"
                                            className="h-auto p-0"
                                            onClick={() =>
                                                setPending({
                                                    action: deactivated ? "reactivate" : "deactivate",
                                                    branch,
                                                })
                                            }
                                        >
                                            {deactivated ? t("page.card.reactivate") : t("page.card.deactivate")}
                                        </Button>
                                    </div>
                                    {/* ml-auto rather than the parent's justify-between: pushes this
                                        button to the row's end when there's room, and to the end of
                                        its own wrapped line when the card is too narrow for all three
                                        controls on one line — avoids overflowing the card either way. */}
                                    <Button variant="outline" size="sm" className="ml-auto" asChild>
                                        <Link to={paths.branches.detail(branch.id)}>{t("page.card.view")}</Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>
            )}

            <BranchFormSheet
                open={formOpen}
                branch={editing}
                isSubmitting={save.isPending}
                onOpenChange={(open) => {
                    setFormOpen(open);
                    if (!open) setEditing(null);
                }}
                onSubmit={(payload) => save.mutate(payload)}
            />

            <AlertDialog open={pending !== null} onOpenChange={({open}) => !open && setPending(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {pending?.action === "deactivate"
                                ? t("page.confirmDialog.deactivate.title")
                                : t("page.confirmDialog.reactivate.title")}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {pending ? (
                                <>
                                    <span className="font-medium">{pending.branch.name}</span> —{" "}
                                    {pending.action === "deactivate"
                                        ? t("page.confirmDialog.deactivate.body")
                                        : t("page.confirmDialog.reactivate.body")}
                                </>
                            ) : null}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={act.isPending}>{tCommon("actions.cancel")}</AlertDialogCancel>
                        <AlertDialogAction disabled={act.isPending} onClick={() => pending && act.mutate(pending)}>
                            {act.isPending
                                ? t("page.confirmDialog.working")
                                : pending?.action === "deactivate"
                                  ? t("page.confirmDialog.deactivate.confirm")
                                  : t("page.confirmDialog.reactivate.confirm")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
