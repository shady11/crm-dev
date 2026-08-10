import {
    BanknoteArrowDown,
    BellIcon,
    CheckCircle2Icon,
    ClockIcon,
    FileUp,
    StickyNotePlus,
    StickyNoteX
} from "lucide-react";

export const NotificationType = {
    TASK_ASSIGNED: "TASK_ASSIGNED",
    TASK_DUE_SOON: "TASK_DUE_SOON",
    TASK_OVERDUE: "TASK_OVERDUE",
    DEAL_STATUS_CHANGED: "DEAL_STATUS_CHANGED",
    RESERVATION_EXPIRING: "RESERVATION_EXPIRING",
    PAYMENT_RECEIVED: "PAYMENT_RECEIVED",
    DOCUMENT_UPLOADED: "DOCUMENT_UPLOADED",
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const NotificationEntityType = {
    TASK: "TASK", DEAL: "DEAL", CLIENT: "CLIENT", DOCUMENT: "DOCUMENT",
} as const;
export type NotificationEntityType = (typeof NotificationEntityType)[keyof typeof NotificationEntityType];

export const NOTIFICATION_VISUALS: Record<NotificationType, { icon: typeof BellIcon; bg: string }> = {
    TASK_ASSIGNED: { icon: StickyNotePlus, bg: "bg-blue-500" },
    TASK_DUE_SOON: { icon: ClockIcon, bg: "bg-amber-400" },
    TASK_OVERDUE: { icon: StickyNoteX, bg: "bg-rose-400" },
    DEAL_STATUS_CHANGED: { icon: CheckCircle2Icon, bg: "bg-emerald-400" },
    RESERVATION_EXPIRING: { icon: ClockIcon, bg: "bg-amber-400" },
    PAYMENT_RECEIVED: { icon: BanknoteArrowDown, bg: "bg-emerald-500" },
    DOCUMENT_UPLOADED: { icon: FileUp, bg: "bg-gray-400" },
};