import { api } from "@/lib/api";
import type { PaginatedResponse } from "@/lib/api-types.ts";
import type { Entrance } from "@/features/entrances/types/entrance.types.ts";

export type EntrancePayload = {
    name: string;
    order?: number;
};

export async function getEntrances(blockId: string) {
    const response = await api.get<PaginatedResponse<Entrance>>(
        `/blocks/${blockId}/entrances`,
    );
    return response.data;
}

export async function createEntrance(
    blockId: string,
    payload: EntrancePayload,
) {
    const response = await api.post<Entrance>(
        `/blocks/${blockId}/entrances`,
        payload,
    );
    return response.data;
}

export async function updateEntrance(
    entranceId: string,
    payload: EntrancePayload,
) {
    const response = await api.patch<Entrance>(
        `/entrances/${entranceId}`,
        payload,
    );
    return response.data;
}

export async function deleteEntrance(entranceId: string) {
    await api.delete(`/entrances/${entranceId}`);
}