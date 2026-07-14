import { api } from "@/lib/api";
import type { PaginatedResponse } from "@/lib/api-types.ts";
import type { Floor } from "@/features/floors/types/floor.types.ts";

export type FloorPayload = {
    number: number;
    order?: number;
};

export async function getFloors(entranceId: string) {
    const response = await api.get<PaginatedResponse<Floor>>(
        `/entrances/${entranceId}/floors`,
    );
    return response.data;
}

export async function createFloor(
    entranceId: string,
    payload: FloorPayload,
) {
    const response = await api.post<Floor>(
        `/entrances/${entranceId}/floors`,
        payload,
    );
    return response.data;
}

export async function updateFloor(
    floorId: string,
    payload: FloorPayload,
) {
    const response = await api.patch<Floor>(
        `/floors/${floorId}`,
        payload,
    );
    return response.data;
}

export async function deleteFloor(floorId: string) {
    await api.delete(`/floors/${floorId}`);
}