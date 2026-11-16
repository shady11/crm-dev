import {useMutation, useQueryClient} from "@tanstack/react-query";
import {toast} from "@/components/ui/toast";
import {reserveUnit, type ReserveUnitPayload} from "@/features/deals/api/deals.api";
import {useTranslation} from "react-i18next";

interface UseBookUnitOptions {
    projectId: string;
    onSuccess?: () => void;
}

export function useBookUnit({ projectId, onSuccess }: UseBookUnitOptions) {
    const { t } = useTranslation("deals");
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: ReserveUnitPayload) => reserveUnit(payload),

        onSuccess: async (deal) => {
            await queryClient.invalidateQueries({ queryKey: ["project-tree", projectId] });
            await queryClient.invalidateQueries({ queryKey: ["project-chessboard", projectId] });
            await queryClient.invalidateQueries({ queryKey: ["deals"] });

            // E2E-7: say so when the discount went for approval, rather than
            // a plain "Unit reserved" that reads as if the price were settled.
            const pending = deal.discountApprovalStatus === "PENDING";
            toast.success({
                title: t("toasts.unitReserved"),
                description: pending
                    ? t("toasts.unitReservedDiscountPending", { number: deal.unit.number, percent: deal.requestedDiscountPercent ?? 0 })
                    : t("toasts.unitReservedDescription", { number: deal.unit.number }),
            });

            onSuccess?.();
        },

        onError: () => {
            toast.error({
                title: t("toasts.reserveError"),
                description: t("toasts.tryAgain"),
            });
        },
    });
}