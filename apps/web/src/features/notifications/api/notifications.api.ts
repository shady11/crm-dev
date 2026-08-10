import {api} from "@/lib/api";
import type {PaginatedResponse} from "@/lib/api-types.ts";
import type {NotificationEntityType, NotificationType} from "@/features/notifications/types/notification.types.ts";

export type Notification = {
    id: string;
    type: NotificationType;
    title: string;
    message: string | null;
    entityType: NotificationEntityType | null;
    entityId: string | null;
    isRead: boolean;
    createdAt: string;
};

export async function getNotifications(params?: { isRead?: boolean; page?: number; limit?: number }) {
    const response = await api.get<PaginatedResponse<Notification>>("/notifications", { params });
    return response.data;
}

export async function getUnreadCount() {
    const response = await api.get<{ count: number }>("/notifications/unread-count");
    return response.data.count;
}

export async function markNotificationAsRead(id: string) {
    await api.patch(`/notifications/${id}/read`);
}

export async function markAllNotificationsAsRead() {
    await api.post("/notifications/read-all");
}