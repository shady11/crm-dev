import { api } from "@/lib/api";
import type { PaginatedResponse } from "@/lib/api-types";
import type { Project } from "../types/project.types";

export type GetProjectsParams = {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
};

export async function getProjects(params?: GetProjectsParams) {
    const response = await api.get<PaginatedResponse<Project>>("/projects", {
        params,
    });

    return response.data;
}