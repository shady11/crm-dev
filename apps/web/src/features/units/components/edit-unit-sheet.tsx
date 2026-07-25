import {Sheet, SheetContent, SheetHeader, SheetTitle} from "@/components/ui/sheet";

import {UnitForm} from "@/features/units/components/unit-form";
import type {Unit} from "@/features/units/types/unit.types";
import type {UpdateUnitPayload} from "@/features/units/types/unit-payload.ts";

interface EditUnitSheetProps {
    unit: Unit | null;

    open: boolean;
    isSubmitting?: boolean;

    errorMessage?: string;
    
    onOpenChange(open: boolean): void;
    onSubmit(payload: UpdateUnitPayload): void;
}

export function EditUnitSheet({
                                  unit,
                                  open,
                                  isSubmitting = false,
                                  errorMessage,
                                  onOpenChange,
                                  onSubmit,
                              }: EditUnitSheetProps) {

    if (!unit) {
        return null;
    }

    return (
        <Sheet
            open={open}
            onOpenChange={({ open }) => onOpenChange(open)}
        >
            <SheetContent
                variant="inset"
                className="sm:max-w-sm"
            >
                <SheetHeader>
                    <SheetTitle>
                        Edit Unit №{unit.number}
                    </SheetTitle>
                </SheetHeader>

                <UnitForm
                    key={unit.id}
                    unit={unit}
                    submitLabel="Save changes"
                    isSubmitting={isSubmitting}
                    errorMessage={errorMessage}
                    onCancel={() => onOpenChange(false)}
                    onSubmit={onSubmit}
                />
            </SheetContent>
        </Sheet>
    );
}