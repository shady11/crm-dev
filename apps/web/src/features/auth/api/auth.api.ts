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

export async function endImpersonation() {
    const response = await api.post<EndImpersonationResponse>("/auth/end-impersonation");
    return response.data;
}