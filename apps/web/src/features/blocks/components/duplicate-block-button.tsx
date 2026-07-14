import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy } from "lucide-react";
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
import { api } from "@/lib/api.ts";
import type { Block } from "@/features/blocks/types/block.types.ts";
import {toast} from "@/components/ui/toast.tsx";

interface DuplicateBlockButtonProps {
    block: Block;
}

export function DuplicateBlockButton({ block }: DuplicateBlockButtonProps) {
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);

    const duplicateMutation = useMutation({
        mutationFn: () => api.post(`/blocks/${block.id}/duplicate`),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["project-tree"] });
            await queryClient.invalidateQueries({ queryKey: ["project", block.projectId] });

            toast.success({
                title: "Successfully created",
                description: `Block ${block.name} has been duplicated.`,
            });

            setOpen(false);
        },
    });

    return (
        <>
            <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => setOpen(true)}
            >
                <Copy className="size-3" />
            </Button>

            <AlertDialog
                open={open}
                onOpenChange={({ open }) => setOpen(open)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Duplicate block?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will create a copy of <strong>Block {block.name}</strong> with all its entrances, floors, and units.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={duplicateMutation.isPending}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            disabled={duplicateMutation.isPending}
                            onClick={() => duplicateMutation.mutate()}
                        >
                            {duplicateMutation.isPending ? "Duplicating..." : "Duplicate"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}