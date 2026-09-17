import { api } from "@/lib/api";
import type { AuthUser, EndImpersonationResponse, LoginResponse } from "../types/auth.types";

export type LoginPayload = {
    email: string;
    password: string;
};

export async function login(payload: LoginPayload) {
    const response = await api.post<LoginResponse>("/auth/login", payload);
    return response.data;
}

export async function getMe() {
    const response = await api.get<AuthUser>("/auth/me");
    return response.data;
}

// SM-A1: self-service name/phone edit, open to every role.
export type UpdateOwnProfilePayload = {
    fullName?: string;
    phone?: string;
};

export async function updateOwnProfile(payload: UpdateOwnProfilePayload) {
    const response = await api.patch<{id: string; fullName: string; email: string; phone: string | null}>(
        "/auth/me",
        payload,
    );
    return response.data;
}

export async function endImpersonation() {
    const response = await api.post<EndImpersonationResponse>("/auth/end-impersonation");
    return response.data;
}

export type ChangeOwnPasswordPayload = {
    currentPassword: string;
    newPassword: string;
};

// Bumps sessionsValidFrom server-side (every other session dies), so the
// caller's own token dies too — the response carries a fresh one, which the
// caller must swap in via authStorage.setToken to stay signed in.
export async function changeOwnPassword(payload: ChangeOwnPasswordPayload) {
    const response = await api.patch<{accessToken: string}>("/auth/me/password", payload);
    return response.data;
}