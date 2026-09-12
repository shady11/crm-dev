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
import type { Unit } from "@/features/units/types/unit.types.ts";
import {useTranslation} from "react-i18next";
import {useAuth} from "@/features/auth/hooks/use-auth.ts";
import {UserRole} from "@/features/users/types/user.types";

interface DuplicateUnitButtonProps {
    unit: Unit;
}

export function DuplicateUnitButton({ unit }: DuplicateUnitButtonProps) {
    const { t } = useTranslation("units");
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);

    const duplicateMutation = useMutation({
        mutationFn: () => api.post(`/units/${unit.id}/duplicate`),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["project-tree"] });
            setIsOpen(false);
        },
    });

    // Duplicating a unit is COMPANY_ADMIN only (POST /units/:id/duplicate).
    if (user?.role !== UserRole.COMPANY_ADMIN) {
        return null;
    }

    return (
        <>
            <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => setIsOpen(true)}
                aria-label={t("common:actions.duplicate")}
            >
                <Copy className="size-3" />
            </Button>

            <AlertDialog open={isOpen} onOpenChange={({open}) => setIsOpen(open)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("duplicate.title")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("duplicate.description", { number: unit.number })}
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