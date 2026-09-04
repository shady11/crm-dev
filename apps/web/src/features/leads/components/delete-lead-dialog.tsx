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
import type {Lead} from "@/features/leads/api/leads.api.ts";
import {useTranslation} from "react-i18next";

interface DeleteLeadDialogProps {
    lead: Lead | null;
    isDeleting: boolean;
    onCancel(): void;
    onConfirm(): void;
}

export function DeleteLeadDialog({ lead, isDeleting, onCancel, onConfirm }: DeleteLeadDialogProps) {
    const { t } = useTranslation("leads");

    return (
        <AlertDialog open={!!lead} onOpenChange={({ open }) => !open && onCancel()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t("deleteDialog.title")}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t("deleteDialog.description", { name: lead?.fullName ?? t("deleteDialog.descriptionFallback") })}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>{t("deleteDialog.cancel")}</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" disabled={isDeleting} onClick={onConfirm}>
                        {isDeleting ? t("deleteDialog.deleting") : t("deleteDialog.delete")}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
