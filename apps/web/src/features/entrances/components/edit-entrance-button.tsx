import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pen } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet.tsx";
import { updateEntrance } from "@/features/entrances/api/entrances.api.ts";
import type { Entrance } from "@/features/entrances/types/entrance.types.ts";
import { EntranceForm } from "./entrance-form.tsx";
import {toast} from "@/components/ui/toast.tsx";
import {useTranslation} from "react-i18next";
import {useAuth} from "@/features/auth/hooks/use-auth.ts";
import {UserRole} from "@/features/users/types/user.types";

interface EditEntranceButtonProps {
    entrance: Entrance;
}

export function EditEntranceButton({ entrance }: EditEntranceButtonProps) {
    const { t } = useTranslation("entrances");
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);

    const updateEntranceMutation = useMutation({
        mutationFn: (payload: { name: string; order?: number }) =>
            updateEntrance(entrance.id, payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["project-tree"] });

            toast.success({
                title: t("toasts.updatedTitle"),
                description: t("toasts.updatedDescription", { name: entrance.name }),
            });

            setOpen(false);
        },
    });

    // Editing an entrance is COMPANY_ADMIN only (PATCH /entrances/:id).
    if (user?.role !== UserRole.COMPANY_ADMIN) {
        return null;
    }

    return (
        <>
            <Button
                size="icon-sm"
                variant="secondary"
                onClick={() => setOpen(true)}
                aria-label={t("common:actions.edit")}
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
                        <SheetTitle>{t("actions.editEntrance")}</SheetTitle>
                    </SheetHeader>
                    <EntranceForm
                        key={`entrance-${entrance.id}-${open ? "open" : "closed"}`}
                        entrance={entrance}
                        errorMessage={
                            updateEntranceMutation.isError
                                ? t("form.errorSave")
                                : undefined
                        }
                        isSubmitting={updateEntranceMutation.isPending}
                        submitLabel={t("common:actions.saveChanges")}
                        onCancel={() => setOpen(false)}
                        onSubmit={(payload) => updateEntranceMutation.mutate(payload)}
                    />
                </SheetContent>
            </Sheet>
        </>
    );
}