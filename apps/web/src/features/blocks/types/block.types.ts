import type {Entrance} from "@/features/entrances/types/entrance.types.ts";
import type {BlockSalesStatus} from "./block-sales.ts";

export type Block = {
    id: string;
    name: string;
    order: string | null;

    projectId: string;

    // Blocks of one project can go on sale and be handed over at different times.
    salesStatus?: BlockSalesStatus;
    completionDate?: string | null;

    createdAt: string;
    updatedAt: string;

    entrances: Entrance[];

    _count?: {
        entrances: number;
        floors: number;
        units: number;
    };
};