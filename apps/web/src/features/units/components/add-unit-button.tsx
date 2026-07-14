import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet.tsx";
import { createUnit } from "@/features/units/api/units.api.ts";
import { UnitForm } from "./unit-form.tsx";
import type {Floor} from "@/features/floors/types/floor.types.ts";
import {toast} from "@/components/ui/toast.tsx";

interface AddUnitButtonProps {
    floor: Floor
}

export function AddUnitButton({ floor }: AddUnitButtonProps) {
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);

    const createUnitMutation = useMutation({
        mutationFn: (payload: any) => createUnit(floor.id, payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["project-tree"] });

            toast.success({
                title: "Successfully created",
                // description: `Floor ${variables.number} has been created.`,
            });

            setOpen(false);
        },
    });

    return (
        <>
            <Button
                size="sm"
                variant="outline"
                onClick={() => setOpen(true)}
            >
                <Plus className="size-3" />
                Add Unit
            </Button>

            <Sheet
                onOpenChange={({ open: isOpen }) => setOpen(isOpen)}
                open={open}
            >
                <SheetContent className="sm:max-w-sm" variant="inset">
                    <SheetHeader>
                        <SheetTitle>Add unit to Floor {floor.number}</SheetTitle>
                    </SheetHeader>
                    <UnitForm
                        key={`unit-new-${open ? "open" : "closed"}`}
                        errorMessage={
                            createUnitMutation.isError
                                ? "Unit could not be created. Check the details and try again."
                                : undefined
                        }
                        isSubmitting={createUnitMutation.isPending}
                        submitLabel="Create unit"
                        onCancel={() => setOpen(false)}
                        onSubmit={(payload) => createUnitMutation.mutate(payload)}
                    />
                </SheetContent>
            </Sheet>
        </>
    );
}