import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pen } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet.tsx";
import { updateBlock } from "@/features/blocks/api/blocks.api.ts";
import type { Block } from "@/features/blocks/types/block.types.ts";
import { BlockForm } from "./block-form.tsx";
import {toast} from "@/components/ui/toast.tsx";
import {useTranslation} from "react-i18next";

interface EditBlockButtonProps {
    block: Block;
}

export function EditBlockButton({ block }: EditBlockButtonProps) {
    const { t } = useTranslation("blocks");
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);

    const updateBlockMutation = useMutation({
        mutationFn: (payload: { name: string; code?: string }) =>
            updateBlock(block.id, payload),
        onSuccess: async (_, variables) => {
            await queryClient.invalidateQueries({ queryKey: ["project-tree"] });
            await queryClient.invalidateQueries({ queryKey: ["project", block.projectId] });

            toast.success({
                title: t("toasts.updatedTitle"),
                description: t("toasts.updatedDescription", { name: variables.name }),
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
                        <SheetTitle>{t("actions.editBlock")}</SheetTitle>
                    </SheetHeader>
                    <BlockForm
                        key={`block-${block.id}-${open ? "open" : "closed"}`}
                        block={block}
                        errorMessage={
                            updateBlockMutation.isError
                                ? t("form.errorGeneric")
                                : undefined
                        }
                        isSubmitting={updateBlockMutation.isPending}
                        submitLabel={t("common:actions.saveChanges")}
                        onCancel={() => setOpen(false)}
                        onSubmit={(payload) => updateBlockMutation.mutate(payload)}
                    />
                </SheetContent>
            </Sheet>
        </>
    );
}