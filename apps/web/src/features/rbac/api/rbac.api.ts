import {api} from "@/lib/api";
import type {Permission, Role, RoleMember} from "../types/rbac.types";

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
    /** Own discretionary discount ceiling, in percent. Omitted/null = unlimited. */
    discountLimit?: number | null;
    /** CA-3: limited to the holder's own branch. */
    isBranchScoped?: boolean;
};

export async function createRole(payload: CreateRolePayload) {
    const response = await api.post<Role>("/rbac/roles", payload);
    return response.data;
}

export type UpdateRolePayload = Partial<{name: string; description: string; discountLimit: number | null; isBranchScoped: boolean}>;

// CA-2: an editable company copy of any role, built-in ones included.
// The name defaults to "<original> (copy)".
export async function copyRole(id: string, name?: string) {
    const response = await api.post<{id: string; name: string}>(`/rbac/roles/${id}/copy`, name ? {name} : {});
    return response.data;
}

export async function updateRole(id: string, payload: UpdateRolePayload) {
    const response = await api.patch<Role>(`/rbac/roles/${id}`, payload);
    return response.data;
}

export async function setRolePermissions(id: string, permissionKeys: string[]) {
    const response = await api.put<Role>(`/rbac/roles/${id}/permissions`, {permissionKeys});
    return response.data;
}

export async function getRoleMembers(id: string) {
    const response = await api.get<RoleMember[]>(`/rbac/roles/${id}/members`);
    return response.data;
}

export async function deleteRole(id: string) {
    await api.delete(`/rbac/roles/${id}`);
}
