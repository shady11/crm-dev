import {useMutation, useQueryClient} from "@tanstack/react-query";

import {toast} from "@/components/ui/toast";
import {useTranslation} from "react-i18next";
import {createUnit} from "@/features/units/api/units.api";

import type {CreateUnitPayload} from "@/features/units/types/unit-payload";

interface UseCreateUnitOptions {
    floorId: string;
    onSuccess?: (payload: CreateUnitPayload) => void;
}

export function useCreateUnit({
                                  floorId,
                                  onSuccess,
                              }: UseCreateUnitOptions) {
    const { t } = useTranslation("units");
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: CreateUnitPayload) =>
            createUnit(floorId, payload),

        onSuccess: async (_, payload) => {
            await queryClient.invalidateQueries({
                queryKey: ["project-tree"],
            });

            toast.success({
                title: t("toasts.createdTitle"),
                description: t("toasts.createdDescription", { number: payload.number }),
            });

            onSuccess?.(payload);
        },
    });
}