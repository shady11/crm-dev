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
import {useTranslation} from "react-i18next";

interface DeleteLeadsDialogProps {
    open: boolean;
    count: number;
    isDeleting: boolean;
    onCancel(): void;
    onConfirm(): void;
}

export function DeleteLeadsDialog({ open, count, isDeleting, onCancel, onConfirm }: DeleteLeadsDialogProps) {
    const { t } = useTranslation("leads");

    return (
        <AlertDialog open={open} onOpenChange={({ open: isOpen }) => !isOpen && onCancel()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t("deleteLeads.title", { count })}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t("deleteLeads.description", { count })}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>{t("deleteLeads.cancel")}</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" disabled={isDeleting} onClick={onConfirm}>
                        {isDeleting ? t("deleteLeads.deleting") : t("deleteLeads.delete")}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
