import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet.tsx";
import { createEntrance } from "@/features/entrances/api/entrances.api.ts";
import { EntranceForm } from "./entrance-form.tsx";
import {toast} from "@/components/ui/toast.tsx";
import {useTranslation} from "react-i18next";
import type {Block} from "@/features/blocks/types/block.types.ts";
import {useAuth} from "@/features/auth/hooks/use-auth.ts";
import {UserRole} from "@/features/users/types/user.types";

interface AddEntranceButtonProps {
    block: Block;
}

export function AddEntranceButton({ block }: AddEntranceButtonProps) {
    const { t } = useTranslation("entrances");
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);

    const createEntranceMutation = useMutation({
        mutationFn: (payload: { name: string; order?: number }) =>
            createEntrance(block.id, payload),
        onSuccess: async (_, variables) => {
            await queryClient.invalidateQueries({ queryKey: ["project-tree"] });

            toast.success({
                title: t("toasts.createdTitle"),
                description: t("toasts.createdDescription", { name: variables.name }),
            });

            setOpen(false);
        },
    });

    const nextEntranceOrder =
        Math.max(
            0,
            ...(block.entrances ?? []).map((e) => Number(e.order) || 0)
        ) + 1;

    // Creating an entrance is COMPANY_ADMIN only (POST /blocks/:id/entrances).
    if (user?.role !== UserRole.COMPANY_ADMIN) {
        return null;
    }

    return (
        <>
            <Button
                size="sm"
                variant="outline"
                onClick={() => setOpen(true)}
            >
                <Plus className="size-3" /> {t("actions.addEntrance")}</Button>

            <Sheet
                onOpenChange={({ open: isOpen }) => setOpen(isOpen)}
                open={open}
            >
                <SheetContent className="sm:max-w-sm" variant="inset">
                    <SheetHeader>
                        <SheetTitle>{t("addToBlock", { name: block.name })}</SheetTitle>
                    </SheetHeader>
                    <EntranceForm
                        key={`entrance-new-${open ? "open" : "closed"}`}
                        defaultOrder={nextEntranceOrder}
                        errorMessage={
                            createEntranceMutation.isError
                                ? t("form.errorCreate")
                                : undefined
                        }
                        isSubmitting={createEntranceMutation.isPending}
                        submitLabel={t("form.submitCreate")}
                        onCancel={() => setOpen(false)}
                        onSubmit={(payload) => createEntranceMutation.mutate(payload)}
                    />
                </SheetContent>
            </Sheet>
        </>
    );
}