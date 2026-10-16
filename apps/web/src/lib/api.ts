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

// Endpoints where a 401 means "the password you typed into this form was
// wrong" rather than "your session has expired" — the global logout below
// would otherwise force-log-out a fully signed-in user for a simple typo.
const REAUTH_ENDPOINTS = ["/auth/me/password", "/auth/2fa/disable"];

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const isReauthEndpoint = REAUTH_ENDPOINTS.some((path) => error.config?.url?.includes(path));

        if (error.response?.status === 401 && !isReauthEndpoint) {
            disconnectNotificationsSocket();

            // SA-5: a "view as" session that ran out goes back to the
            // platform admin's own session, where they were, instead of
            // signing them out. If that session has expired too, the next
            // 401 lands here with nothing stashed and signs out as usual.
            const impersonatorToken = authStorage.getImpersonatorToken();
            if (error.response?.data?.code === "IMPERSONATION_ENDED" && impersonatorToken) {
                const returnTo = authStorage.getImpersonationReturn() ?? "/companies";
                authStorage.setToken(impersonatorToken);
                authStorage.clearImpersonatorToken();
                authStorage.setFlash("impersonation.ended");
                window.location.href = returnTo;
                return Promise.reject(error);
            }

            authStorage.clear();
            authStorage.clearImpersonatorToken();
            window.location.href = "/login";
        }

        return Promise.reject(error);
    },
);