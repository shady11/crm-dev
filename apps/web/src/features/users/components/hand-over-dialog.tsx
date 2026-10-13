import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {toast} from "@/components/ui/toast.tsx";
import {Spinner} from "@/components/ui/spinner.tsx";
import {ReassignManagerDialog} from "@/features/users/components/reassign-manager-dialog.tsx";
import {getHandoverPreview, handOverWork} from "@/features/users/api/users.api.ts";

type Props = {
    /** The person whose work moves; null keeps the dialog closed. */
    person: { id: string; fullName: string; branchId: string | null } | null;
    onClose(): void;
};

/**
 * SH-5: a Sales Head moving everything a manager holds (open leads, active
 * deals, open tasks) to someone else on the team, e.g. when they're away
 * or leaving. Shows what will move before it does.
 */
export function HandOverDialog({person, onClose}: Props) {
    const {t} = useTranslation("users");
    const queryClient = useQueryClient();

    const preview = useQuery({
        queryKey: ["users", "handover", person?.id],
        queryFn: () => getHandoverPreview(person!.id),
        enabled: !!person,
    });

    const handOver = useMutation({
        mutationFn: (managerId: string) => handOverWork(person!.id, managerId),
        onSuccess: async (result) => {
            await Promise.all(
                ["leads", "deals", "tasks", "dashboard", "users"].map((key) => queryClient.invalidateQueries({queryKey: [key]})),
            );
            toast.success({
                title: t("handover.successTitle", {name: person?.fullName}),
                description: t("handover.successDescription", result),
            });
            onClose();
        },
        onError: () => toast.error({title: t("handover.errorTitle")}),
    });

    const nothingToMove = !!preview.data && preview.data.leads + preview.data.deals + preview.data.tasks === 0;

    return (
        <ReassignManagerDialog
            open={!!person}
            entityName={person?.fullName ?? ""}
            branchId={person?.branchId ?? null}
            currentManagerId={person?.id}
            isSubmitting={handOver.isPending}
            confirmDisabled={preview.isLoading || nothingToMove}
            title={t("handover.title", {name: person?.fullName})}
            description={t("handover.description", {name: person?.fullName})}
            confirmLabel={t("handover.confirm")}
            onOpenChange={(open) => { if (!open) onClose(); }}
            onConfirm={(managerId) => handOver.mutate(managerId)}
        >
            <div className="mb-4 rounded-md border border-secondary px-3 py-2.5 text-sm">
                {preview.isLoading ? (
                    <Spinner />
                ) : preview.data ? (
                    nothingToMove ? (
                        <p className="text-muted-foreground">{t("handover.nothing", {name: person?.fullName})}</p>
                    ) : (
                        <ul className="space-y-0.5">
                            <li>{t("handover.leads", {count: preview.data.leads})}</li>
                            <li>{t("handover.deals", {count: preview.data.deals})}</li>
                            <li>{t("handover.tasks", {count: preview.data.tasks})}</li>
                        </ul>
                    )
                ) : null}
            </div>
        </ReassignManagerDialog>
    );
}
