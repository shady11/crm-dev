import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy } from "lucide-react";
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
import { api } from "@/lib/api.ts";
import type { Block } from "@/features/blocks/types/block.types.ts";
import {toast} from "@/components/ui/toast.tsx";
import {useTranslation} from "react-i18next";
import {useAuth} from "@/features/auth/hooks/use-auth.ts";
import {UserRole} from "@/features/users/types/user.types";

interface DuplicateBlockButtonProps {
    block: Block;
}

export function DuplicateBlockButton({ block }: DuplicateBlockButtonProps) {
    const { t } = useTranslation("blocks");
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);

    const duplicateMutation = useMutation({
        mutationFn: () => api.post(`/blocks/${block.id}/duplicate`),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["project-tree"] });
            await queryClient.invalidateQueries({ queryKey: ["project", block.projectId] });

            toast.success({
                title: t("toasts.duplicatedTitle"),
                description: t("toasts.duplicatedDescription", { name: block.name }),
            });

            setOpen(false);
        },
    });

    // Duplicating a block is COMPANY_ADMIN only (POST /blocks/:id/duplicate).
    if (user?.role !== UserRole.COMPANY_ADMIN) {
        return null;
    }

    return (
        <>
            <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => setOpen(true)}
                aria-label={t("common:actions.duplicate")}
            >
                <Copy className="size-3" />
            </Button>

            <AlertDialog
                open={open}
                onOpenChange={({ open }) => setOpen(open)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("duplicate.title")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("duplicate.descriptionPrefix")}
                            <strong>{t("duplicate.nameLabel", { name: block.name })}</strong>
                            {t("duplicate.descriptionSuffix")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={duplicateMutation.isPending}>{t("common:actions.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={duplicateMutation.isPending}
                            onClick={() => duplicateMutation.mutate()}
                        >
                            {duplicateMutation.isPending ? t("common:actions.duplicating") : t("common:actions.duplicate")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}