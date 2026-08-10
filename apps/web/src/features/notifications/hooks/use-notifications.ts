import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {
    getNotifications,
    getUnreadCount,
    markAllNotificationsAsRead,
    markNotificationAsRead
} from "@/features/notifications/api/notifications.api.ts";

export function useUnreadCount() {
    return useQuery({
        queryKey: ["notifications", "unread-count"],
        queryFn: getUnreadCount,
        refetchInterval: 5 * 60_000,
    });
}

export function useNotificationsList(enabled: boolean, isRead?: boolean) {
    return useQuery({
        queryKey: ["notifications", "list", { isRead }],
        queryFn: () => getNotifications({ isRead, limit: 30 }),
        enabled,
    });
}

export function useNotificationActions() {
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ["notifications"] });

    const markAsRead = useMutation({
        mutationFn: (id: string) => markNotificationAsRead(id),
        onSuccess: invalidate,
    });

    const markAllAsRead = useMutation({
        mutationFn: () => markAllNotificationsAsRead(),
        onSuccess: invalidate,
    });

    return { markAsRead, markAllAsRead };
}