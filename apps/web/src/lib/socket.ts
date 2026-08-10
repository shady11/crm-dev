import {io, type Socket} from "socket.io-client";
import {authStorage} from "@/features/auth/utils/auth-storage.ts";

let socket: Socket | null = null;

export function getNotificationsSocket(): Socket | null {
    const token = authStorage.getToken();
    if (!token) return null;

    if (socket?.connected) return socket;

    const apiOrigin = new URL(import.meta.env.VITE_API_URL).origin;

    socket = io(`${apiOrigin}/notifications`, {
        auth: { token },
        transports: ["websocket"],
    });

    return socket;
}

export function disconnectNotificationsSocket() {
    socket?.disconnect();
    socket = null;
}