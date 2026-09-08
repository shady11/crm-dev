import {api} from "@/lib/api";
import type {SettingOption, SettingOptionType} from "../types/setting-option.types";

export async function getSettingOptions(params: {type?: SettingOptionType; includeInactive?: boolean} = {}) {
    const response = await api.get<SettingOption[]>("/setting-options", {params});
    return response.data;
}

export type CreateSettingOptionPayload = {
    type: SettingOptionType;
    code: string;
    label: string;
};

export async function createSettingOption(payload: CreateSettingOptionPayload) {
    const response = await api.post<SettingOption>("/setting-options", payload);
    return response.data;
}

export type UpdateSettingOptionPayload = Partial<{label: string; isActive: boolean}>;

export async function updateSettingOption(id: string, payload: UpdateSettingOptionPayload) {
    const response = await api.patch<SettingOption>(`/setting-options/${id}`, payload);
    return response.data;
}

export async function deleteSettingOption(id: string) {
    const response = await api.delete<{success: boolean}>(`/setting-options/${id}`);
    return response.data;
}
