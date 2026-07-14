import type {Unit} from "@/features/units/types/unit.types.ts";

export type Floor = {
    id: string;
    number: number;
    order: number;
    entranceId: string;
    createdAt: string;
    updatedAt: string;

    units: Unit[];

    _count?: {
        units: number;
    };
};