import { api } from "@/lib/api";
import type { PaginatedResponse } from "@/lib/api-types";
import type { Project, ProjectStatus } from "../types/project.types";
import type { UnitStatus, UnitType } from "@/features/units/types/unit.types";

export type GetProjectsParams = {
    page?: number;
    limit?: number;
    search?: string;
    status?: ProjectStatus;
};

export async function getProjects(params?: GetProjectsParams) {
    const response = await api.get<PaginatedResponse<Project>>("/projects", {
        params,
    });

    return response.data;
}

export type ProjectPayload = {
    name: string;
    address?: string;
    status?: ProjectStatus;
};

export async function createProject(payload: ProjectPayload) {
    const response = await api.post<Project>("/projects", payload);

    return response.data;
}

export async function getProject(id: string) {
    const response = await api.get<Project>(`/projects/${id}`);

    return response.data;
}

export async function updateProject(id: string, payload: ProjectPayload) {
    const response = await api.patch<Project>(`/projects/${id}`, payload);

    return response.data;
}

export async function deleteProject(id: string) {
    await api.delete(`/projects/${id}`);
}

export async function getProjectTree(projectId: string) {
    const response = await api.get(
        `/projects/${projectId}/tree`,
    );

    return response.data;
}

export type GetProjectChessboardParams = {
    blockId?: string;
    entranceId?: string;
    type?: UnitType;
    status?: UnitStatus;
    rooms?: number;
    areaMin?: number;
    areaMax?: number;
    priceMin?: number;
    priceMax?: number;
};

export async function getProjectChessboard(
    projectId: string,
    params?: GetProjectChessboardParams,
) {
    const response = await api.get(
        `/projects/${projectId}/chessboard`,
        { params },
    );

    return response.data;
}
