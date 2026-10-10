import {api} from "@/lib/api";
import type {Phase, PhaseSalesStatus} from "../types/phase.types";

export type PhasePayload = {
    name: string;
    salesStatus: PhaseSalesStatus;
    // YYYY-MM-DD; null clears it.
    completionDate: string | null;
    order?: number;
};

export async function getPhases(projectId: string) {
    const response = await api.get<Phase[]>(`/projects/${projectId}/phases`);
    return response.data;
}

export async function createPhase(projectId: string, payload: PhasePayload) {
    const response = await api.post<Phase>(`/projects/${projectId}/phases`, payload);
    return response.data;
}

export async function updatePhase(id: string, payload: Partial<PhasePayload>) {
    const response = await api.patch<Phase>(`/phases/${id}`, payload);
    return response.data;
}

export async function deletePhase(id: string) {
    await api.delete(`/phases/${id}`);
}
