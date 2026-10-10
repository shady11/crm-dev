import type {Entrance} from "@/features/entrances/types/entrance.types.ts";
import type {PhaseSummary} from "@/features/phases/types/phase.types.ts";

export type Block = {
    id: string;
    name: string;
    order: string | null;

    projectId: string;
    // Construction phase (project tree); null when not grouped.
    phaseId?: string | null;
    // Construction phase (chessboard); null when not grouped.
    phase?: PhaseSummary | null;

    createdAt: string;
    updatedAt: string;

    entrances: Entrance[];

    _count?: {
        entrances: number;
        floors: number;
        units: number;
    };
};