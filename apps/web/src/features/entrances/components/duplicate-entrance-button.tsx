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
import type { Entrance } from "@/features/entrances/types/entrance.types.ts";
import {toast} from "@/components/ui/toast.tsx";

interface DuplicateEntranceButtonProps {
    entrance: Entrance;
}

export function DuplicateEntranceButton({ entrance }: DuplicateEntranceButtonProps) {
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);

    const duplicateMutation = useMutation({
        mutationFn: () => api.post(`/entrances/${entrance.id}/duplicate`),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["project-tree"] });

            toast.success({
                title: "Successfully duplicated",
                // description: `Entrance ${entrance.name} has been duplicated.`,
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
                        <AlertDialogTitle>Duplicate entrance?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will create a copy of <strong>Entrance {entrance.name}</strong> with all its floors and units.
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