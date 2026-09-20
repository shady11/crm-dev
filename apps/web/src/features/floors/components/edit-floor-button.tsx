import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pen } from "lucide-react";
import { IconTooltipButton } from "@/components/shared/icon-tooltip-button.tsx";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet.tsx";
import { updateFloor } from "@/features/floors/api/floors.api.ts";
import type { Floor } from "@/features/floors/types/floor.types.ts";
import { FloorForm } from "./floor-form.tsx";
import {toast} from "@/components/ui/toast.tsx";
import {useTranslation} from "react-i18next";
import {useAuth} from "@/features/auth/hooks/use-auth.ts";
import {hasPermission} from "@/features/auth/access";

interface EditFloorButtonProps {
    floor: Floor;
}

export function EditFloorButton({ floor }: EditFloorButtonProps) {
    const { t } = useTranslation("floors");
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);

    const updateFloorMutation = useMutation({
        mutationFn: (payload: { number: number; order?: number }) =>
            updateFloor(floor.id, payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["project-tree"] });

            toast.success({
                title: t("toasts.updatedTitle"),
            });

            setOpen(false);
        },
    });

    // Editing a floor is COMPANY_ADMIN only (PATCH /floors/:id).
    if (!hasPermission(user, "inventory.manage")) {
        return null;
    }

    return (
        <>
            <IconTooltipButton
                size="icon-sm"
                variant="secondary"
                onClick={() => setOpen(true)}
                label={t("common:actions.edit")}
            >
                <Pen className="size-3" />
            </IconTooltipButton>

            <Sheet
                onOpenChange={({ open: isOpen }) => setOpen(isOpen)}
                open={open}
            >
                <SheetContent className="sm:max-w-sm" variant="inset">
                    <SheetHeader>
                        <SheetTitle>{t("actions.editFloor")}</SheetTitle>
                    </SheetHeader>
                    <FloorForm
                        key={`floor-${floor.id}-${open ? "open" : "closed"}`}
                        floor={floor}
                        errorMessage={
                            updateFloorMutation.isError
                                ? t("form.errorSave")
                                : undefined
                        }
                        isSubmitting={updateFloorMutation.isPending}
                        submitLabel={t("common:actions.saveChanges")}
                        onCancel={() => setOpen(false)}
                        onSubmit={(payload) => updateFloorMutation.mutate(payload)}
                    />
                </SheetContent>
            </Sheet>
        </>
    );
}