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
import type { Unit } from "@/features/units/types/unit.types.ts";

interface DuplicateUnitButtonProps {
    unit: Unit;
}

export function DuplicateUnitButton({ unit }: DuplicateUnitButtonProps) {
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);

    const duplicateMutation = useMutation({
        mutationFn: () => api.post(`/units/${unit.id}/duplicate`),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["project-tree"] });
            setIsOpen(false);
        },
    });

    return (
        <>
            <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => setIsOpen(true)}
            >
                <Copy className="size-3" />
            </Button>

            <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Duplicate unit?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will create a copy of Unit №{unit.number}.
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