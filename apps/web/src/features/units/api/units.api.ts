import {api} from "@/lib/api";
import type {PaginatedResponse} from "@/lib/api-types.ts";
import type {Unit, UnitStatus} from "@/features/units/types/unit.types";
import type {CreateUnitPayload, UpdateUnitPayload} from "@/features/units/types/unit-payload.ts";
import type {ImportUnitsResult} from "@/features/units/types/unit-import.types.ts";

export async function getUnits(floorId: string) {
    const response = await api.get<PaginatedResponse<Unit>>(
        `/floors/${floorId}/units`,
    );
    return response.data;
}

export async function getUnit(id: string) {
    const response = await api.get<Unit>(`/units/${id}`);
    return response.data;
}

export async function createUnit(
    floorId: string,
    payload: CreateUnitPayload,
) {
    const response = await api.post<Unit>(
        `/floors/${floorId}/units`,
        payload,
    );
    return response.data;
}

export async function updateUnit(
    unitId: string,
    payload: UpdateUnitPayload,
) {
    // priceRequestId: the new price was sent for approval instead of applied (SH-2).
    const response = await api.patch<Unit & { priceRequestId?: string | null }>(
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

/** CA-7: an example import file, headers in the given language. */
export async function downloadImportSample(lang: string) {
    const response = await api.get<Blob>("/units/import-sample", {params: {lang}, responseType: "blob"});
    const url = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = "units-import-sample.xlsx";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

export async function importUnits(projectId: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post<ImportUnitsResult>(`/projects/${projectId}/units/import`, formData, {
        headers: {"Content-Type": "multipart/form-data"},
    });
    return response.data;
}