import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pen } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet.tsx";
import { updateEntrance } from "@/features/entrances/api/entrances.api.ts";
import type { Entrance } from "@/features/entrances/types/entrance.types.ts";
import { EntranceForm } from "./entrance-form.tsx";
import {toast} from "@/components/ui/toast.tsx";

interface EditEntranceButtonProps {
    entrance: Entrance;
}

export function EditEntranceButton({ entrance }: EditEntranceButtonProps) {
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);

    const updateEntranceMutation = useMutation({
        mutationFn: (payload: { name: string; order?: number }) =>
            updateEntrance(entrance.id, payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["project-tree"] });

            toast.success({
                title: "Successfully updated",
                // description: `Entrance ${variables.name} has been updated.`,
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
                <SheetContent
                    className="sm:max-w-md"
                    variant="inset"
                >
                    <SheetHeader>
                        <SheetTitle>Edit entrance</SheetTitle>
                    </SheetHeader>
                    <EntranceForm
                        key={`entrance-${entrance.id}-${open ? "open" : "closed"}`}
                        entrance={entrance}
                        errorMessage={
                            updateEntranceMutation.isError
                                ? "Entrance could not be saved. Check the details and try again."
                                : undefined
                        }
                        isSubmitting={updateEntranceMutation.isPending}
                        submitLabel="Save changes"
                        onCancel={() => setOpen(false)}
                        onSubmit={(payload) => updateEntranceMutation.mutate(payload)}
                    />
                </SheetContent>
            </Sheet>
        </>
    );
}