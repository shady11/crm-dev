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
import type { Floor } from "@/features/floors/types/floor.types.ts";
import {toast} from "@/components/ui/toast.tsx";

interface DuplicateFloorButtonProps {
    floor: Floor;
}

export function DuplicateFloorButton({ floor }: DuplicateFloorButtonProps) {
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);

    const duplicateMutation = useMutation({
        mutationFn: () => api.post(`/floors/${floor.id}/duplicate`),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["project-tree"] });

            toast.success({
                title: "Successfully duplicated",
                // description: `Floor ${floor.name} has been duplicated.`,
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
                        <AlertDialogTitle>Duplicate floor?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will create a copy of Floor {floor.number} with all its units.
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