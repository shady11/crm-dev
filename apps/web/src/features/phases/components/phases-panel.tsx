import {useState} from "react";
import {isAxiosError} from "axios";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {CalendarIcon, Pen, Plus, Trash2Icon} from "lucide-react";
import {Badge} from "@/components/ui/badge.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {IconTooltipButton} from "@/components/shared/icon-tooltip-button.tsx";
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
import {toast} from "@/components/ui/toast.tsx";
import {createPhase, deletePhase, type PhasePayload, updatePhase} from "@/features/phases/api/phases.api.ts";
import {usePhases} from "@/features/phases/hooks/use-phases.ts";
import {completionQuarter, type Phase, PHASE_STATUS_BADGE_CLASSES, PHASE_STATUS_LABEL_KEYS} from "@/features/phases/types/phase.types.ts";
import {PhaseDialog} from "./phase-dialog.tsx";

/**
 * The project's construction phases in the builder: each with its sales
 * status, expected completion and blocks. Blocks are assigned to a phase
 * from the block row below.
 */
export function PhasesPanel({projectId, canManage}: {projectId: string; canManage: boolean}) {
    const {t} = useTranslation("phases");
    const queryClient = useQueryClient();
    const {phases} = usePhases(projectId);
    const [editing, setEditing] = useState<Phase | "new" | null>(null);
    const [deleting, setDeleting] = useState<Phase | null>(null);

    const invalidate = async () => {
        await queryClient.invalidateQueries({queryKey: ["phases", projectId]});
        await queryClient.invalidateQueries({queryKey: ["project-chessboard", projectId]});
    };

    const saveMutation = useMutation({
        mutationFn: (payload: PhasePayload) =>
            editing && editing !== "new" ? updatePhase(editing.id, payload) : createPhase(projectId, {...payload, order: phases.length}),
        onSuccess: async () => {
            await invalidate();
            toast.success({title: t("toasts.saved")});
            setEditing(null);
        },
        onError: (error) => {
            toast.error({title: isAxiosError(error) && error.response?.status === 409 ? t("toasts.nameTaken") : t("toasts.error")});
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => deletePhase(id),
        onSuccess: async () => {
            await invalidate();
            await queryClient.invalidateQueries({queryKey: ["project-tree", projectId]});
            toast.success({title: t("toasts.deleted")});
            setDeleting(null);
        },
        onError: () => toast.error({title: t("toasts.error")}),
    });

    // Nothing to show a viewer when the project has no phases.
    if (!canManage && phases.length === 0) return null;

    return (
        <Card className="border border-secondary pt-0 shadow-none">
            <CardHeader className="flex items-start justify-between gap-3 border-b py-4">
                <div className="space-y-1">
                    <CardTitle>{t("panel.title")}</CardTitle>
                    <p className="text-sm text-muted-foreground">{t("panel.description")}</p>
                </div>
                {canManage && (
                    <Button size="sm" variant="secondary" onClick={() => setEditing("new")}>
                        <Plus className="size-3" />
                        {t("panel.add")}
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                {phases.length === 0 ? (
                    <p className="py-2 text-sm text-muted-foreground">{t("panel.empty")}</p>
                ) : (
                    <div className="flex flex-col divide-y">
                        {phases.map((phase) => {
                            const quarter = completionQuarter(t, phase.completionDate);
                            return (
                                <div key={phase.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="font-medium">{phase.name}</p>
                                            <Badge className={PHASE_STATUS_BADGE_CLASSES[phase.salesStatus]}>
                                                {t(PHASE_STATUS_LABEL_KEYS[phase.salesStatus])}
                                            </Badge>
                                            {quarter && (
                                                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                                                    <CalendarIcon className="size-3.5" />
                                                    {quarter}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {phase.blocks.length > 0
                                                ? `${t("panel.blocks", {count: phase.blocks.length})}: ${phase.blocks.map((b) => b.name).join(", ")}`
                                                : t("panel.noBlocks")}
                                        </p>
                                    </div>
                                    {canManage && (
                                        <div className="flex gap-1.5">
                                            <IconTooltipButton size="icon-sm" variant="secondary" label={t("common:actions.edit")} onClick={() => setEditing(phase)}>
                                                <Pen className="size-3" />
                                            </IconTooltipButton>
                                            <IconTooltipButton size="icon-sm" variant="secondary" label={t("common:actions.delete")} onClick={() => setDeleting(phase)}>
                                                <Trash2Icon className="size-3 text-destructive" />
                                            </IconTooltipButton>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>

            {editing && (
                <PhaseDialog
                    key={editing === "new" ? "new" : editing.id}
                    open
                    phase={editing === "new" ? null : editing}
                    isSubmitting={saveMutation.isPending}
                    onCancel={() => setEditing(null)}
                    onSubmit={(payload) => saveMutation.mutate(payload)}
                />
            )}

            <AlertDialog open={!!deleting} onOpenChange={({open}) => !open && setDeleting(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("delete.title", {name: deleting?.name})}</AlertDialogTitle>
                        <AlertDialogDescription>{t("delete.description")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteMutation.isPending}>{t("common:actions.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            disabled={deleteMutation.isPending}
                            onClick={() => deleting && deleteMutation.mutate(deleting.id)}
                        >
                            {t("common:actions.delete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}
