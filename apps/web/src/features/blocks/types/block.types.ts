import type {Entrance} from "@/features/entrances/types/entrance.types.ts";

export type Block = {
    id: string;
    name: string;
    order: string | null;

    projectId: string;

    createdAt: string;
    updatedAt: string;

    entrances: Entrance[];

    _count?: {
        entrances: number;
        floors: number;
        units: number;
    };
};