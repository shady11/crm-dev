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

interface DeleteClientsDialogProps {
    open: boolean;
    count: number;
    isDeleting: boolean;
    onCancel(): void;
    onConfirm(): void;
}

export function DeleteClientsDialog({ open, count, isDeleting, onCancel, onConfirm }: DeleteClientsDialogProps) {
    const { t } = useTranslation("clients");

    return (
        <AlertDialog open={open} onOpenChange={({ open: isOpen }) => !isOpen && onCancel()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t("deleteClients.title", { count })}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t("deleteClients.description", { count })}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>{t("deleteClients.cancel")}</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" disabled={isDeleting} onClick={onConfirm}>
                        {isDeleting ? t("deleteClients.deleting") : t("deleteClients.delete")}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
