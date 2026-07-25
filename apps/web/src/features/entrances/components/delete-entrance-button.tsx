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

interface DeleteEntranceButtonProps {
    entrance: Entrance;
}

export function DeleteEntranceButton({ entrance }: DeleteEntranceButtonProps) {
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);

    const deleteEntranceMutation = useMutation({
        mutationFn: () => deleteEntrance(entrance.id),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["project-tree"] });

            toast.success({
                title: "Successfully deleted",
                // description: `Entrance ${entrance.name} has been deleted.`,
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
                        <AlertDialogTitle>Delete entrance?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete Entrance {entrance.name} and all its floors and units.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteEntranceMutation.isPending}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            disabled={deleteEntranceMutation.isPending}
                            onClick={() => deleteEntranceMutation.mutate()}
                        >
                            {deleteEntranceMutation.isPending ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}