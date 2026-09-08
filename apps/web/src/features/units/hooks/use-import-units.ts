import {useMutation, useQueryClient} from "@tanstack/react-query";
import {importUnits} from "@/features/units/api/units.api.ts";

export function useImportUnits(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (file: File) => importUnits(projectId, file),
        onSuccess: async () => {
            // Same key ProjectStructure already invalidates after creating a
            // block, so newly-imported blocks/entrances/floors/units show up
            // immediately without a manual refresh.
            await queryClient.invalidateQueries({queryKey: ["project-tree", projectId]});
        },
    });
}
