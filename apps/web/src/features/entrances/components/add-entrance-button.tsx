import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet.tsx";
import { createEntrance } from "@/features/entrances/api/entrances.api.ts";
import { EntranceForm } from "./entrance-form.tsx";
import {toast} from "@/components/ui/toast.tsx";
import type {Block} from "@/features/blocks/types/block.types.ts";

interface AddEntranceButtonProps {
    block: Block;
}

export function AddEntranceButton({ block }: AddEntranceButtonProps) {
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);

    const createEntranceMutation = useMutation({
        mutationFn: (payload: { name: string; order?: number }) =>
            createEntrance(block.id, payload),
        onSuccess: async (_, variables) => {
            await queryClient.invalidateQueries({ queryKey: ["project-tree"] });

            toast.success({
                title: "Successfully created",
                description: `Entrance ${variables.name} has been created.`,
            });

            setOpen(false);
        },
    });

    const nextEntranceOrder =
        Math.max(
            0,
            ...(block.entrances ?? []).map((e) => Number(e.order) || 0)
        ) + 1;

    return (
        <>
            <Button
                size="sm"
                variant="outline"
                onClick={() => setOpen(true)}
            >
                <Plus className="size-3" />
                Add Entrance
            </Button>

            <Sheet
                onOpenChange={({ open: isOpen }) => setOpen(isOpen)}
                open={open}
            >
                <SheetContent className="sm:max-w-sm" variant="inset">
                    <SheetHeader>
                        <SheetTitle>Add entrance to Block {block.name}</SheetTitle>
                    </SheetHeader>
                    <EntranceForm
                        key={`entrance-new-${open ? "open" : "closed"}`}
                        defaultOrder={nextEntranceOrder}
                        errorMessage={
                            createEntranceMutation.isError
                                ? "Entrance could not be created. Check the details and try again."
                                : undefined
                        }
                        isSubmitting={createEntranceMutation.isPending}
                        submitLabel="Create entrance"
                        onCancel={() => setOpen(false)}
                        onSubmit={(payload) => createEntranceMutation.mutate(payload)}
                    />
                </SheetContent>
            </Sheet>
        </>
    );
}