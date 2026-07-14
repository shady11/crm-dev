import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {LayoutGrid} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet.tsx";
import { api } from "@/lib/api.ts";
import {BulkUnitsForm} from "@/features/units/components/bulk-units-form.tsx";
import type {Unit} from "@/features/units/types/unit.types.ts";

interface AddUnitsBulkButtonProps {
    floorId: string;
    floorNumber: number;
    allBlockUnits?: Unit[];
}

export function AddUnitsBulkButton({
                                       floorId,
                                       floorNumber,
                                       allBlockUnits = []
                                   }: AddUnitsBulkButtonProps) {
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);

    const createUnitsBulkMutation = useMutation({
        mutationFn: (payload: { units: any[] }) =>
            api.post(`/floors/${floorId}/units/bulk`, payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["project-tree"] });
            setOpen(false);
        },
    });

    const lastGlobalUnitNumber = allBlockUnits.length > 0
        ? Math.max(...allBlockUnits.map(u => parseInt(u.number) || 0))
        : 0;

    return (
        <>
            <Button
                size="sm"
                variant="outline"
                onClick={() => setOpen(true)}
            >
                <LayoutGrid className="size-3" />
                Bulk Units
            </Button>

            <Sheet onOpenChange={({ open: isOpen }) => setOpen(isOpen)} open={open}>
                <SheetContent variant="inset" className="sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle>Add multiple units to Floor {floorNumber}</SheetTitle>
                    </SheetHeader>
                    <BulkUnitsForm
                        existingUnits={allBlockUnits.map(u => ({ number: u.number }))}
                        lastGlobalUnitNumber={lastGlobalUnitNumber}
                        errorMessage={
                            createUnitsBulkMutation.isError
                                ? "Units could not be created. Check the details and try again."
                                : undefined
                        }
                        isSubmitting={createUnitsBulkMutation.isPending}
                        onCancel={() => setOpen(false)}
                        onSubmit={(payload) => createUnitsBulkMutation.mutate(payload)}
                    />
                </SheetContent>
            </Sheet>
        </>
    );
}