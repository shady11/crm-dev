import {api} from "@/lib/api";
import type {Permission, Role, UserRolesResponse} from "../types/rbac.types";

export async function getPermissions() {
    const response = await api.get<Permission[]>("/rbac/permissions");
    return response.data;
}

export async function getRoles() {
    const response = await api.get<Role[]>("/rbac/roles");
    return response.data;
}

export type CreateRolePayload = {
    name: string;
    description?: string;
    permissionKeys: string[];
};

export async function createRole(payload: CreateRolePayload) {
    const response = await api.post<Role>("/rbac/roles", payload);
    return response.data;
}

export type UpdateRolePayload = Partial<{name: string; description: string}>;

export async function updateRole(id: string, payload: UpdateRolePayload) {
    const response = await api.patch<Role>(`/rbac/roles/${id}`, payload);
    return response.data;
}

export async function setRolePermissions(id: string, permissionKeys: string[]) {
    const response = await api.put<Role>(`/rbac/roles/${id}/permissions`, {permissionKeys});
    return response.data;
}

export async function getRoleUserIds(id: string) {
    const response = await api.get<string[]>(`/rbac/roles/${id}/users`);
    return response.data;
}

export async function deleteRole(id: string) {
    await api.delete(`/rbac/roles/${id}`);
}

export async function getUserRoles(userId: string) {
    const response = await api.get<UserRolesResponse>(`/rbac/users/${userId}/roles`);
    return response.data;
}

export async function assignRoleToUser(userId: string, roleId: string) {
    const response = await api.post<UserRolesResponse>(`/rbac/users/${userId}/roles/${roleId}`);
    return response.data;
}

export async function revokeRoleFromUser(userId: string, roleId: string) {
    const response = await api.delete<UserRolesResponse>(`/rbac/users/${userId}/roles/${roleId}`);
    return response.data;
}
