import {api} from "@/lib/api";
import type {PaginatedResponse} from "@/lib/api-types.ts";
import type {TaskStatus} from "@/features/tasks/types/task.types.ts";

export type Task = {
    id: string;
    title: string;
    description: string | null;
    dueDate: string | null;
    status: TaskStatus;
    createdAt: string;
    updatedAt: string;
    assignedTo: { id: string; fullName: string };
    lead: { id: string; fullName: string } | null;
    client: { id: string; fullName: string } | null;
    deal: { id: string; dealNumber: string } | null;
};

export type TaskStatusSummaryItem = { status: TaskStatus; count: number };

export type GetTasksParams = {
    status?: TaskStatus;
    assignedToId?: string;
    dealId?: string;
    clientId?: string;
    leadId?: string;
    // Admin-only cross-branch filter (BR-B3); ignored server-side for a
    // branch-scoped caller, whose own branch filter already takes precedence.
    branchId?: string;
    search?: string;
    overdue?: boolean;
    page?: number;
    limit?: number;
};

export type TaskPayload = {
    title: string;
    description?: string;
    dueDate?: string;
    status?: TaskStatus;
    assignedToId: string;
    leadId?: string;
    clientId?: string;
    dealId?: string;
};

export async function getTasks(params?: GetTasksParams) {
    const response = await api.get<PaginatedResponse<Task>>("/tasks", { params });
    return response.data;
}

export async function getTaskStatusSummary(branchId?: string) {
    const response = await api.get<TaskStatusSummaryItem[]>("/tasks/status-summary", { params: { branchId } });
    return response.data;
}

export async function createTask(payload: TaskPayload) {
    const response = await api.post<Task>("/tasks", payload);
    return response.data;
}

export async function updateTask(id: string, payload: Partial<TaskPayload>) {
    const response = await api.patch<Task>(`/tasks/${id}`, payload);
    return response.data;
}

export async function updateTaskStatus(id: string, status: TaskStatus) {
    const response = await api.patch<Task>(`/tasks/${id}/status`, { status });
    return response.data;
}

export async function deleteTask(id: string) {
    await api.delete(`/tasks/${id}`);
}