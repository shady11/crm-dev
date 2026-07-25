import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pen } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet.tsx";
import { updateFloor } from "@/features/floors/api/floors.api.ts";
import type { Floor } from "@/features/floors/types/floor.types.ts";
import { FloorForm } from "./floor-form.tsx";
import {toast} from "@/components/ui/toast.tsx";

interface EditFloorButtonProps {
    floor: Floor;
}

export function EditFloorButton({ floor }: EditFloorButtonProps) {
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);

    const updateFloorMutation = useMutation({
        mutationFn: (payload: { number: number; order?: number }) =>
            updateFloor(floor.id, payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["project-tree"] });

            toast.success({
                title: "Successfully updated",
                // description: `Floor ${variables.name} has been updated.`,
            });

            setOpen(false);
        },
    });

    return (
        <>
            <Button
                size="icon-sm"
                variant="secondary"
                onClick={() => setOpen(true)}
            >
                <Pen className="size-3" />
            </Button>

            <Sheet
                onOpenChange={({ open: isOpen }) => setOpen(isOpen)}
                open={open}
            >
                <SheetContent className="sm:max-w-sm" variant="inset">
                    <SheetHeader>
                        <SheetTitle>Edit floor</SheetTitle>
                    </SheetHeader>
                    <FloorForm
                        key={`floor-${floor.id}-${open ? "open" : "closed"}`}
                        floor={floor}
                        errorMessage={
                            updateFloorMutation.isError
                                ? "Floor could not be saved. Check the details and try again."
                                : undefined
                        }
                        isSubmitting={updateFloorMutation.isPending}
                        submitLabel="Save changes"
                        onCancel={() => setOpen(false)}
                        onSubmit={(payload) => updateFloorMutation.mutate(payload)}
                    />
                </SheetContent>
            </Sheet>
        </>
    );
}