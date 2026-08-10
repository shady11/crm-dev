import {useEffect} from "react";
import {useQueryClient} from "@tanstack/react-query";
import {getNotificationsSocket} from "@/lib/socket.ts";
import {toast} from "@/components/ui/toast.tsx";
import type {Notification} from "@/features/notifications/api/notifications.api.ts";

export function useNotificationsSocket() {
    const queryClient = useQueryClient();

    useEffect(() => {
        const socket = getNotificationsSocket();
        if (!socket) return;

        const handleNew = (notification: Notification) => {
            queryClient.invalidateQueries({ queryKey: ["notifications", "list"] });
            toast.info({ title: notification.title, description: notification.message ?? undefined });
        };

        const handleUnreadCount = ({ count }: { count: number }) => {
            queryClient.setQueryData(["notifications", "unread-count"], count);
        };

        socket.on("notification:new", handleNew);
        socket.on("notification:unread-count", handleUnreadCount);

        return () => {
            socket.off("notification:new", handleNew);
            socket.off("notification:unread-count", handleUnreadCount);
        };
    }, [queryClient]);
}