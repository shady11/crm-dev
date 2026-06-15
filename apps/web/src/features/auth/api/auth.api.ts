import { api } from "@/lib/api";
import type { AuthUser, LoginResponse } from "../types/auth.types";

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