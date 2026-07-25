import {useState} from "react";
import {Plus} from "lucide-react";
import {Button} from "@/components/ui/button.tsx";
import {Sheet, SheetContent, SheetHeader, SheetTitle} from "@/components/ui/sheet.tsx";
import {UnitForm} from "./unit-form.tsx";
import type {Floor} from "@/features/floors/types/floor.types.ts";
import {useCreateUnit} from "@/features/units/hooks/use-create-unit.ts";

interface AddUnitButtonProps {
    floor: Floor;
}

export function AddUnitButton({
                                  floor,
                              }: AddUnitButtonProps) {
    const [open, setOpen] = useState(false);

    const createUnitMutation = useCreateUnit({
        floorId: floor.id,
        onSuccess: () => setOpen(false),
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
                open={open}
                onOpenChange={({ open }) => setOpen(open)}
            >
                <SheetContent
                    variant="inset"
                    className="sm:max-w-sm"
                >
                    <SheetHeader>
                        <SheetTitle>
                            Add Unit to Floor {floor.number}
                        </SheetTitle>
                    </SheetHeader>

                    <UnitForm
                        errorMessage={
                            createUnitMutation.isError
                                ? "Unit could not be created. Check the details and try again."
                                : undefined
                        }
                        isSubmitting={createUnitMutation.isPending}
                        submitLabel="Create Unit"
                        onCancel={() => setOpen(false)}
                        onSubmit={createUnitMutation.mutate}
                    />
                </SheetContent>
            </Sheet>
        </>
    );
}