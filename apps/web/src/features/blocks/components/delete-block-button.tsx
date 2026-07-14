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
import { deleteBlock } from "@/features/blocks/api/blocks.api.ts";
import type { Block } from "@/features/blocks/types/block.types.ts";
import {toast} from "@/components/ui/toast.tsx";

interface DeleteBlockButtonProps {
    block: Block;
}

export function DeleteBlockButton({ block }: DeleteBlockButtonProps) {
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);

    const deleteBlockMutation = useMutation({
        mutationFn: () => deleteBlock(block.id),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["project-tree"] });
            await queryClient.invalidateQueries({ queryKey: ["project", block.projectId] });

            toast.success({
                title: "Successfully deleted",
                description: `Block ${block.name} has been deleted.`,
            });

            setIsOpen(false);
        },
    });

    return (
        <>
            <Button
                size="icon-sm"
                variant="destructive"
                onClick={() => setIsOpen(true)}
            >
                <Trash2 className="size-3" />
            </Button>

            <AlertDialog
                open={isOpen}
                onOpenChange={({ open }) => setIsOpen(open)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete block?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete Block {block.name} and all its entrances, floors, and units.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteBlockMutation.isPending}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            disabled={deleteBlockMutation.isPending}
                            onClick={() => deleteBlockMutation.mutate()}
                        >
                            {deleteBlockMutation.isPending ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}