import {useState} from "react";
import {Plus} from "lucide-react";
import {Button} from "@/components/ui/button.tsx";
import {Sheet, SheetContent, SheetHeader, SheetTitle} from "@/components/ui/sheet.tsx";
import {UnitForm} from "./unit-form.tsx";
import type {Floor} from "@/features/floors/types/floor.types.ts";
import {useCreateUnit} from "@/features/units/hooks/use-create-unit.ts";
import {useTranslation} from "react-i18next";

interface AddUnitButtonProps {
    floor: Floor;
}

export function AddUnitButton({
                                  floor,
                              }: AddUnitButtonProps) {
    const { t } = useTranslation("units");
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
                <Plus className="size-3" /> {t("actions.addUnit")}</Button>

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
                            {t("sheets.addTitle", { number: floor.number })}
                        </SheetTitle>
                    </SheetHeader>

                    <UnitForm
                        errorMessage={
                            createUnitMutation.isError
                                ? t("form.errorCreate")
                                : undefined
                        }
                        isSubmitting={createUnitMutation.isPending}
                        submitLabel={t("form.submitCreate")}
                        onCancel={() => setOpen(false)}
                        onSubmit={createUnitMutation.mutate}
                    />
                </SheetContent>
            </Sheet>
        </>
    );
}