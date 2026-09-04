import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet.tsx";
import { createFloor } from "@/features/floors/api/floors.api.ts";
import { FloorForm } from "./floor-form.tsx";
import type {Entrance} from "@/features/entrances/types/entrance.types.ts";
import {toast} from "@/components/ui/toast.tsx";
import {useTranslation} from "react-i18next";

interface AddFloorButtonProps {
    entrance: Entrance;
}

export function AddFloorButton({ entrance }: AddFloorButtonProps) {
    const { t } = useTranslation("floors");
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);

    const createFloorMutation = useMutation({
        mutationFn: (payload: { number: number; order?: number }) =>
            createFloor(entrance.id, payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["project-tree"] });

            toast.success({
                title: t("toasts.createdTitle"),
            });

            setOpen(false);
        },
    });

    const nextFloorOrder =
        Math.max(
            0,
            ...(entrance.floors ?? []).map((e) => Number(e.order) || 0)
        ) + 1;

    const nextFloorNumber =
        Math.max(
            0,
            ...(entrance.floors ?? []).map((e) => Number(e.number) || 0)
        ) + 1;

    return (
        <>
            <Button
                size="sm"
                variant="outline"
                onClick={() => setOpen(true)}
            >
                <Plus className="size-3" /> {t("actions.addFloor")}</Button>

            <Sheet
                onOpenChange={({ open: isOpen }) => setOpen(isOpen)}
                open={open}
            >
                <SheetContent className="sm:max-w-sm" variant="inset">
                    <SheetHeader>
                        <SheetTitle>{t("addToEntrance", { name: entrance.name })}</SheetTitle>
                    </SheetHeader>
                    <FloorForm
                        key={`floor-new-${open ? "open" : "closed"}`}
                        defaultNumber={nextFloorNumber}
                        defaultOrder={nextFloorOrder}
                        errorMessage={
                            createFloorMutation.isError
                                ? t("form.errorGeneric")
                                : undefined
                        }
                        isSubmitting={createFloorMutation.isPending}
                        submitLabel={t("form.submitCreate")}
                        onCancel={() => setOpen(false)}
                        onSubmit={(payload) => createFloorMutation.mutate(payload)}
                    />
                </SheetContent>
            </Sheet>
        </>
    );
}