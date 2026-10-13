import {useMutation, useQueryClient} from "@tanstack/react-query";

import {useTranslation} from "react-i18next";
import {toast} from "@/components/ui/toast.tsx";
import {updateUnit} from "@/features/units/api/units.api.ts";
import type {UpdateUnitPayload} from "@/features/units/types/unit-payload.ts";

interface UseUpdateUnitOptions {
    projectId: string;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
}

export function useUpdateUnit({
                                  projectId,
                                  onSuccess,
                                  onError,
                              }: UseUpdateUnitOptions) {
    const queryClient = useQueryClient();
    const { t } = useTranslation("units");

    return useMutation({
        mutationFn: ({
                         unitId,
                         payload,
                     }: {
            unitId: string;
            payload: UpdateUnitPayload;
        }) => updateUnit(unitId, payload),

        onSuccess: async (unit) => {
            // SH-2: the price waits for an approver; say so, since the
            // chessboard still shows the old one.
            if (unit.priceRequestId) {
                toast.success({ title: t("toasts.updatedTitle"), description: t("toasts.priceSentForApproval") });
            }
            await queryClient.invalidateQueries({ queryKey: ["unit", unit.id] });
            await queryClient.invalidateQueries({
                queryKey: ["project-tree", projectId],
            });
            await queryClient.invalidateQueries({
                queryKey: ["project-chessboard", projectId],
            });

            onSuccess?.();
        },

        onError(error) {
            onError?.(error as Error);
        },
    });
}