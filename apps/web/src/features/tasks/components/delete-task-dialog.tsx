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
import type {Task} from "@/features/tasks/api/tasks.api.ts";
import {useTranslation} from "react-i18next";

interface DeleteTaskDialogProps {
    task: Task | null;
    isDeleting: boolean;
    onCancel(): void;
    onConfirm(): void;
}

export function DeleteTaskDialog({ task, isDeleting, onCancel, onConfirm }: DeleteTaskDialogProps) {
    const { t } = useTranslation("tasks");

    return (
        <AlertDialog open={!!task} onOpenChange={({ open }) => !open && onCancel()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t("deleteDialog.title")}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t("deleteDialog.description", { title: task?.title ?? "" })}
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
