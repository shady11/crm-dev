import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import { deleteBlock } from "@/features/blocks/api/blocks.api.ts";
import type { Block } from "@/features/blocks/types/block.types.ts";
import {toast} from "@/components/ui/toast.tsx";
import {useTranslation} from "react-i18next";
import {useAuth} from "@/features/auth/hooks/use-auth.ts";
import {UserRole} from "@/features/users/types/user.types";

interface DeleteBlockButtonProps {
    block: Block;
}

export function DeleteBlockButton({ block }: DeleteBlockButtonProps) {
    const { t } = useTranslation("blocks");
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);

    const deleteBlockMutation = useMutation({
        mutationFn: () => deleteBlock(block.id),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["project-tree"] });
            await queryClient.invalidateQueries({ queryKey: ["project", block.projectId] });

            toast.success({
                title: t("toasts.deletedTitle"),
                description: t("toasts.deletedDescription", { name: block.name }),
            });

            setIsOpen(false);
        },
    });

    // Deleting a block is COMPANY_ADMIN only (DELETE /blocks/:id).
    if (user?.role !== UserRole.COMPANY_ADMIN) {
        return null;
    }

    return (
        <>
            <Button
                size="icon-sm"
                variant="destructive"
                onClick={() => setIsOpen(true)}
                aria-label={t("common:actions.delete")}
            >
                <Trash2 className="size-3" />
            </Button>

            <AlertDialog
                open={isOpen}
                onOpenChange={({ open }) => setIsOpen(open)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("delete.title")}</AlertDialogTitle>
                        <AlertDialogDescription>{t("delete.description", { name: block.name })}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteBlockMutation.isPending}>{t("common:actions.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            disabled={deleteBlockMutation.isPending}
                            onClick={() => deleteBlockMutation.mutate()}
                        >
                            {deleteBlockMutation.isPending ? t("common:actions.deleting") : t("common:actions.delete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}