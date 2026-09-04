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
import { deleteFloor } from "@/features/floors/api/floors.api.ts";
import type { Floor } from "@/features/floors/types/floor.types.ts";
import {toast} from "@/components/ui/toast.tsx";
import {useTranslation} from "react-i18next";

interface DeleteFloorButtonProps {
    floor: Floor;
}

export function DeleteFloorButton({ floor }: DeleteFloorButtonProps) {
    const { t } = useTranslation("floors");
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);

    const deleteFloorMutation = useMutation({
        mutationFn: () => deleteFloor(floor.id),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["project-tree"] });

            toast.success({
                title: t("toasts.deletedTitle"),
            });

            setOpen(false);
        },
    });

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
                        <AlertDialogDescription>{t("delete.description", { number: floor.number })}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteFloorMutation.isPending}>{t("common:actions.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            disabled={deleteFloorMutation.isPending}
                            onClick={() => deleteFloorMutation.mutate()}
                        >
                            {deleteFloorMutation.isPending ? t("common:actions.deleting") : t("common:actions.delete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}