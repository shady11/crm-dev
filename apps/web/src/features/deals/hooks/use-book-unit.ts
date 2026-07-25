import {useMutation, useQueryClient} from "@tanstack/react-query";
import {toast} from "@/components/ui/toast";
import {reserveUnit, type ReserveUnitPayload} from "@/features/deals/api/deals.api";

interface UseBookUnitOptions {
    projectId: string;
    onSuccess?: () => void;
}

export function useBookUnit({ projectId, onSuccess }: UseBookUnitOptions) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: ReserveUnitPayload) => reserveUnit(payload),

        onSuccess: async (deal) => {
            await queryClient.invalidateQueries({ queryKey: ["project-tree", projectId] });
            await queryClient.invalidateQueries({ queryKey: ["deals"] });

            toast.success({
                title: "Unit reserved",
                description: `Unit №${deal.unit.number} has been reserved.`,
            });

            onSuccess?.();
        },

        onError: () => {
            toast.error({
                title: "Failed to reserve unit",
                description: "Please try again.",
            });
        },
    });
}