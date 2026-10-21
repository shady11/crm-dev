import {useState} from "react";
import {useTranslation} from "react-i18next";
import {Textarea} from "@/components/ui/textarea.tsx";
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
import type {Company} from "../types/company.types";

export type PendingCompanyAction = {action: "suspend" | "resume" | "delete" | "restore"; company: Company};

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

export function CompanyConfirmDialog({
    pending,
    isPending,
    onCancel,
    onConfirm,
}: {
    pending: PendingCompanyAction | null;
    isPending: boolean;
    onCancel(): void;
    onConfirm(reason?: string): void;
}) {
    const {t} = useTranslation("companies");
    const {t: tCommon} = useTranslation("common");
    const COPY = useConfirmCopy();
    const copy = pending ? COPY[pending.action] : null;
    const [reason, setReason] = useState("");

    const close = () => {
        setReason("");
        onCancel();
    };

    return (
        <AlertDialog open={pending !== null} onOpenChange={({open}) => !open && close()}>
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
                {/* SA-12: why, for whoever reads the audit log later. */}
                {pending?.action === "suspend" ? (
                    <label className="block space-y-1.5 px-6 pb-2 text-sm">
                        <span className="font-medium">{t("confirmDialog.suspend.reasonLabel")}</span>
                        <Textarea
                            value={reason}
                            maxLength={500}
                            placeholder={t("confirmDialog.suspend.reasonPlaceholder")}
                            onChange={(event) => setReason(event.target.value)}
                        />
                    </label>
                ) : null}
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPending}>{tCommon("actions.cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                        disabled={isPending}
                        onClick={() => {
                            const trimmed = reason.trim();
                            setReason("");
                            onConfirm(trimmed || undefined);
                        }}
                    >
                        {isPending ? t("confirmDialog.working") : copy?.confirm}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
