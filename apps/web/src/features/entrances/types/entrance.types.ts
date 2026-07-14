import type {Floor} from "@/features/floors/types/floor.types.ts";

export type Entrance = {
    id: string;
    name: string;
    order: string;
    blockId: string;
    createdAt: string;
    updatedAt: string;

    floors: Floor[];

    _count?: {
        floors: number;
        units: number;
    };
};