import {paths} from "@/routes/paths.ts";
import type {Notification} from "@/features/notifications/api/notifications.api.ts";

export function getNotificationLink(notification: Notification): string | null {
    if (!notification.entityType || !notification.entityId) return null;

    switch (notification.entityType) {
        case "LEAD": return paths.leadDetail(notification.entityId);
        case "DEAL": return paths.deals.detail(notification.entityId);
        // SH-2: every list-price change, pending or decided, lives there.
        case "UNIT_PRICE_REQUEST":
        case "UNIT": return paths.priceChanges;
        case "CLIENT": return paths.clients.detail(notification.entityId);
        case "TASK": return paths.tasks?.root ?? "/tasks"; // отдельного маршрута на одну задачу пока нет
        default: return null;
    }
}