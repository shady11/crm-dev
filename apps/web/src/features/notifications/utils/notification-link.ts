import {paths} from "@/routes/paths.ts";
import type {Notification} from "@/features/notifications/api/notifications.api.ts";

export function getNotificationLink(notification: Notification): string | null {
    if (!notification.entityType || !notification.entityId) return null;

    switch (notification.entityType) {
        case "DEAL": return paths.deals.detail(notification.entityId);
        case "CLIENT": return paths.clients.detail(notification.entityId);
        case "TASK": return paths.tasks?.root ?? "/tasks"; // отдельного маршрута на одну задачу пока нет
        default: return null;
    }
}