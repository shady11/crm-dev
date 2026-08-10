import axios from "axios";
import {authStorage} from "@/features/auth/utils/auth-storage.ts";
import {disconnectNotificationsSocket} from "@/lib/socket.ts";

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
    const token = authStorage.getToken();

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            disconnectNotificationsSocket();
            authStorage.clear();
            window.location.href = "/login";
        }

        return Promise.reject(error);
    },
);