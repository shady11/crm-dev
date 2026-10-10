import {createListCollection} from "@ark-ui/react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {toast} from "@/components/ui/toast.tsx";
import {updateBlock} from "@/features/blocks/api/blocks.api.ts";
import type {Phase} from "@/features/phases/types/phase.types.ts";

const NONE = "none";

/** Moves a block into a phase, or out of one, from the builder's block row. */
export function BlockPhaseSelect({blockId, projectId, phaseId, phases}: {
    blockId: string;
    projectId: string;
    phaseId: string | null;
    phases: Phase[];
}) {
    const {t} = useTranslation("phases");
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (next: string | null) => updateBlock(blockId, {phaseId: next}),
        onSuccess: async (_data, next) => {
            await queryClient.invalidateQueries({queryKey: ["project-tree", projectId]});
            await queryClient.invalidateQueries({queryKey: ["phases", projectId]});
            await queryClient.invalidateQueries({queryKey: ["project-chessboard", projectId]});
            const phase = phases.find((p) => p.id === next);
            toast.success({title: phase ? t("toasts.blockUpdated", {phase: phase.name}) : t("toasts.blockCleared")});
        },
        onError: () => toast.error({title: t("toasts.error")}),
    });

    const collection = createListCollection({
        items: [
            {label: t("block.none"), value: NONE},
            ...phases.map((phase) => ({label: phase.name, value: phase.id})),
        ],
    });

    return (
        <Select
            collection={collection}
            value={[phaseId ?? NONE]}
            disabled={mutation.isPending}
            onValueChange={({value}) => {
                const next = value[0] === NONE || !value[0] ? null : value[0];
                if (next !== phaseId) mutation.mutate(next);
            }}
        >
            <SelectTrigger size="sm" className="w-36" aria-label={t("block.label")}>
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {collection.items.map((item) => (
                    <SelectItem key={item.value} item={item}>{item.label}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
