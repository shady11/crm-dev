import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {Layers2} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet.tsx";
import { api } from "@/lib/api.ts";
import { BulkFloorsForm } from "./bulk-floors-form.tsx";
import type {Floor} from "@/features/floors/types/floor.types.ts";
import type {Entrance} from "@/features/entrances/types/entrance.types.ts";
import {toast} from "@/components/ui/toast.tsx";
import {useTranslation} from "react-i18next";

interface AddFloorsBulkButtonProps {
    entrance: Entrance;
    existingFloors?: Floor[];
}

export function AddFloorsBulkButton({
                                        entrance,
                                        existingFloors = []
                                    }: AddFloorsBulkButtonProps) {
    const { t } = useTranslation("floors");
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);

    const createFloorsBulkMutation = useMutation({
        mutationFn: (payload: { floors: { number: number; order?: number }[] }) =>
            api.post(`/entrances/${entrance.id}/floors/bulk`, payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["project-tree"] });

            toast.success({
                title: t("toasts.createdTitle"),
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
                <Layers2 className="size-3"/> {t("actions.bulkFloors")}</Button>

            <Sheet
                onOpenChange={({ open: isOpen }) => setOpen(isOpen)}
                open={open}
            >
                <SheetContent className="sm:max-w-sm" variant="inset">
                    <SheetHeader>
                        <SheetTitle>{t("bulk.title", { name: entrance.name })}</SheetTitle>
                    </SheetHeader>
                    <BulkFloorsForm
                        existingFloors={existingFloors}
                        errorMessage={
                            createFloorsBulkMutation.isError
                                ? t("bulk.errorGeneric")
                                : undefined
                        }
                        isSubmitting={createFloorsBulkMutation.isPending}
                        onCancel={() => setOpen(false)}
                        onSubmit={(payload) => createFloorsBulkMutation.mutate(payload)}
                    />
                </SheetContent>
            </Sheet>
        </>
    );
}