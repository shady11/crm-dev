import {
    BadgePercentIcon,
    BanknoteArrowDown,
    BellIcon,
    CalendarClockIcon,
    CalendarX2Icon,
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
    TASK_ESCALATED: "TASK_ESCALATED",
    PAYMENT_DUE_SOON: "PAYMENT_DUE_SOON",
    PAYMENT_OVERDUE: "PAYMENT_OVERDUE",
    DISCOUNT_APPROVAL_REQUESTED: "DISCOUNT_APPROVAL_REQUESTED",
    DISCOUNT_DECIDED: "DISCOUNT_DECIDED",
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const NotificationEntityType = {
    TASK: "TASK", DEAL: "DEAL", CLIENT: "CLIENT", DOCUMENT: "DOCUMENT", PAYMENT_SCHEDULE: "PAYMENT_SCHEDULE",
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
    TASK_ESCALATED: { icon: StickyNoteX, bg: "bg-rose-500" },
    PAYMENT_DUE_SOON: { icon: CalendarClockIcon, bg: "bg-amber-400" },
    PAYMENT_OVERDUE: { icon: CalendarX2Icon, bg: "bg-rose-500" },
    DISCOUNT_APPROVAL_REQUESTED: { icon: BadgePercentIcon, bg: "bg-amber-500" },
    DISCOUNT_DECIDED: { icon: BadgePercentIcon, bg: "bg-blue-500" },
};

/**
 * Icon and colour for a notification. Falls back to a plain bell for a type
 * this build doesn't know yet: the API can add types before the web app
 * ships, and one unknown row used to crash the whole bell.
 */
export function notificationVisual(type: string) {
    return NOTIFICATION_VISUALS[type as NotificationType] ?? { icon: BellIcon, bg: "bg-gray-400" };
}