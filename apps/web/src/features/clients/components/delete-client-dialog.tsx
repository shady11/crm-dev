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
import type {Client} from "@/features/clients/types/client.types";
import {useTranslation} from "react-i18next";

interface DeleteClientDialogProps {
    client: Client | null;
    isDeleting: boolean;
    onCancel(): void;
    onConfirm(): void;
}

export function DeleteClientDialog({ client, isDeleting, onCancel, onConfirm }: DeleteClientDialogProps) {
    const { t } = useTranslation("clients");

    return (
        <AlertDialog open={!!client} onOpenChange={({ open }) => !open && onCancel()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t("deleteDialog.title")}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t("deleteDialog.description", { name: client?.fullName ?? t("deleteDialog.descriptionFallback") })}
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
