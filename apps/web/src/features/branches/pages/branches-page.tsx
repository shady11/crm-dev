import {useState} from "react";
import {Link} from "react-router-dom";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {toast} from "sonner";
import {useTranslation} from "react-i18next";
import {
    Building2,
    EllipsisVertical,
    InfoIcon,
    MapPin,
    PauseCircle,
    PencilIcon,
    Phone,
    PlayCircle,
    Plus
} from "lucide-react";
import {Badge} from "@/components/ui/badge.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Card, CardAction, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
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
    createBranch,
    type CreateBranchPayload,
    deactivateBranch,
    getBranches,
    reactivateBranch,
    updateBranch,
} from "../api/branches.api";
import {type Branch, BRANCH_STATUS_BADGE_CLASSES, isDeactivated} from "../types/branch.types";
import {BranchFormSheet} from "../components/branch-form-sheet";
import {paths} from "@/routes/paths";
import {Menu, MenuContent, MenuItem, MenuTrigger} from "@/components/ui/menu.tsx";

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
                </div>

                <div className="flex items-center gap-2">
                    <Input
                        placeholder={t("page.searchPlaceholder")}
                        aria-label={t("page.searchPlaceholder")}
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        className="max-w-sm"
                    />
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
            </div>

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
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3">
                    {items.map((branch) => {
                        const deactivated = isDeactivated(branch);
                        const hasDetails = branch.address || branch.city || branch.phone;

                        return (
                            <Card key={branch.id} className={deactivated ? "opacity-60" : undefined}>
                                <CardHeader className="flex justify-between items-center">
                                    <CardTitle>{branch.name}</CardTitle>
                                    <CardAction className="flex items-center gap-3">
                                        <Badge variant="default" className={BRANCH_STATUS_BADGE_CLASSES[deactivated ? 1 : 0]}>
                                            {deactivated ? t("status.deactivated") : t("status.active")}
                                        </Badge>
                                        <Menu>
                                            <MenuTrigger asChild>
                                                <Button size="icon-xs" variant="ghost">
                                                    <EllipsisVertical className="size-3.5"/>
                                                </Button>
                                            </MenuTrigger>
                                            <MenuContent className="w-40">
                                                <MenuItem value="copy" asChild>
                                                    <Link to={paths.branches.detail(branch.id)}>
                                                        <InfoIcon />
                                                        {t("page.card.view")}
                                                    </Link>
                                                </MenuItem>
                                                <MenuItem value="edit"
                                                          onClick={() => {
                                                              setEditing(branch);
                                                              setFormOpen(true);
                                                          }}>
                                                    <PencilIcon />
                                                    {t("page.card.edit")}
                                                </MenuItem>
                                                <MenuItem value="share"
                                                          onClick={() =>
                                                              setPending({
                                                                  action: deactivated ? "reactivate" : "deactivate",
                                                                  branch,
                                                              })
                                                          }>
                                                    {deactivated ? <PlayCircle /> : <PauseCircle />}
                                                    {deactivated ? t("page.card.reactivate") : t("page.card.deactivate")}
                                                </MenuItem>
                                            </MenuContent>
                                        </Menu>
                                    </CardAction>
                                </CardHeader>

                                <CardContent className="space-y-1 text-sm">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="size-3.5"/>
                                        <div className="flex gap-1">
                                            {branch.city ? <span>{branch.city}</span> : null}
                                            -
                                            {branch.address ? <span>{branch.address}</span> : null}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Phone className="size-3.5"/>
                                        <div className="flex gap-1">
                                            {branch.phone ? <span>{branch.phone}</span> : null}
                                        </div>
                                    </div>

                                    {!hasDetails ? (
                                        <p className="text-muted-foreground">{t("page.card.noDetails")}</p>
                                    ) : null}
                                </CardContent>
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
