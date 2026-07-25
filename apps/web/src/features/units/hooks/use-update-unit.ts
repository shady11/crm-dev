import {useMutation, useQueryClient} from "@tanstack/react-query";

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

    return useMutation({
        mutationFn: ({
                         unitId,
                         payload,
                     }: {
            unitId: string;
            payload: UpdateUnitPayload;
        }) => updateUnit(unitId, payload),

        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: ["project-tree", projectId],
            });

            onSuccess?.();
        },

        onError(error) {
            onError?.(error as Error);
        },
    });
}