import {useEffect, useRef} from "react";
import {useQueryClient} from "@tanstack/react-query";
import {getNotificationsSocket} from "@/lib/socket.ts";
import {toast} from "@/components/ui/toast.tsx";
import type {Notification} from "@/features/notifications/api/notifications.api.ts";
import {useNotificationText} from "@/features/notifications/hooks/use-notification-text.ts";

export function useNotificationsSocket(enabled = true) {
    const queryClient = useQueryClient();
    // Kept in a ref so a language switch doesn't reconnect the socket.
    const text = useNotificationText();
    const textFor = useRef(text);
    useEffect(() => {
        textFor.current = text;
    }, [text]);

    useEffect(() => {
        if (!enabled) return;
        const socket = getNotificationsSocket();
        if (!socket) return;

        const handleNew = (notification: Notification) => {
            queryClient.invalidateQueries({ queryKey: ["notifications", "list"] });
            const { title, message } = textFor.current(notification);
            toast.info({ title, description: message ?? undefined });
        };

        // A notification was rewritten in place (e.g. "approval needed"
        // after someone decided): refetch, without a toast.
        const handleUpdated = () => {
            queryClient.invalidateQueries({ queryKey: ["notifications", "list"] });
        };

        const handleUnreadCount = ({ count }: { count: number }) => {
            queryClient.setQueryData(["notifications", "unread-count"], count);
        };

        socket.on("notification:new", handleNew);
        socket.on("notification:updated", handleUpdated);
        socket.on("notification:unread-count", handleUnreadCount);

        return () => {
            socket.off("notification:new", handleNew);
            socket.off("notification:updated", handleUpdated);
            socket.off("notification:unread-count", handleUnreadCount);
        };
    }, [enabled, queryClient]);
}