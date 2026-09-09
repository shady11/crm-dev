import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
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
import { deleteEntrance } from "@/features/entrances/api/entrances.api.ts";
import type { Entrance } from "@/features/entrances/types/entrance.types.ts";
import {toast} from "@/components/ui/toast.tsx";
import {useTranslation} from "react-i18next";
import {useAuth} from "@/features/auth/hooks/use-auth.ts";
import {UserRole} from "@/features/users/types/user.types";

interface DeleteEntranceButtonProps {
    entrance: Entrance;
}

export function DeleteEntranceButton({ entrance }: DeleteEntranceButtonProps) {
    const { t } = useTranslation("entrances");
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);

    const deleteEntranceMutation = useMutation({
        mutationFn: () => deleteEntrance(entrance.id),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["project-tree"] });

            toast.success({
                title: t("toasts.deletedTitle"),
                description: t("toasts.deletedDescription", { name: entrance.name }),
            });

            setOpen(false);
        },
    });

    // Deleting an entrance is COMPANY_ADMIN only (DELETE /entrances/:id).
    if (user?.role !== UserRole.COMPANY_ADMIN) {
        return null;
    }

    return (
        <>
            <Button
                size="icon-sm"
                variant="destructive"
                onClick={() => setOpen(true)}
            >
                <Trash2 className="size-3" />
            </Button>

            <AlertDialog
                open={open}
                onOpenChange={({ open }) => setOpen(open)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("delete.title")}</AlertDialogTitle>
                        <AlertDialogDescription>{t("delete.description", { name: entrance.name })}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteEntranceMutation.isPending}>{t("common:actions.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            disabled={deleteEntranceMutation.isPending}
                            onClick={() => deleteEntranceMutation.mutate()}
                        >
                            {deleteEntranceMutation.isPending ? t("common:actions.deleting") : t("common:actions.delete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}