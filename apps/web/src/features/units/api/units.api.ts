import { api } from "@/lib/api";
import type { PaginatedResponse } from "@/lib/api-types.ts";
import type { Unit, UnitStatus, UnitType } from "@/features/units/types/unit.types";

export type UnitPayload = {
    number: string;
    type?: UnitType;
    status?: UnitStatus;
    rooms?: number;
    area: number;
    price: number;
};

export async function getUnits(floorId: string) {
    const response = await api.get<PaginatedResponse<Unit>>(
        `/floors/${floorId}/units`,
    );
    return response.data;
}

export async function createUnit(
    floorId: string,
    payload: UnitPayload,
) {
    const response = await api.post<Unit>(
        `/floors/${floorId}/units`,
        payload,
    );
    return response.data;
}

export async function updateUnit(
    unitId: string,
    payload: Partial<UnitPayload>,
) {
    const response = await api.patch<Unit>(
        `/units/${unitId}`,
        payload,
    );
    return response.data;
}

export async function updateUnitStatus(
    unitId: string,
    status: UnitStatus,
) {
    const response = await api.patch<Unit>(
        `/units/${unitId}/status`,
        { status },
    );
    return response.data;
}

export async function deleteUnit(unitId: string) {
    await api.delete(`/units/${unitId}`);
}