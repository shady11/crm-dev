export const TaskStatus = {
    TODO: "TODO",
    IN_PROGRESS: "IN_PROGRESS",
    DONE: "DONE",
    CANCELLED: "CANCELLED",
} as const;

export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const TASK_STATUS_LABEL_KEYS: Record<TaskStatus, string> = {
    [TaskStatus.TODO]: "tasks:status.to_do",
    [TaskStatus.IN_PROGRESS]: "tasks:status.in_progress",
    [TaskStatus.DONE]: "tasks:status.done",
    [TaskStatus.CANCELLED]: "tasks:status.cancelled",
};

export const TASK_STATUS_CLASSES: Record<TaskStatus, string> = {
    [TaskStatus.TODO]: "bg-gray-400",
    [TaskStatus.IN_PROGRESS]: "bg-blue-400",
    [TaskStatus.DONE]: "bg-emerald-400",
    [TaskStatus.CANCELLED]: "bg-rose-400",
};

export const TASK_TERMINAL_STATUSES: TaskStatus[] = [TaskStatus.DONE, TaskStatus.CANCELLED];

export const TaskPriority = {
    LOW: "LOW",
    MEDIUM: "MEDIUM",
    HIGH: "HIGH",
} as const;

export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority];

export const TASK_PRIORITY_LABEL_KEYS: Record<TaskPriority, string> = {
    [TaskPriority.LOW]: "tasks:priority.low",
    [TaskPriority.MEDIUM]: "tasks:priority.medium",
    [TaskPriority.HIGH]: "tasks:priority.high",
};

export const TASK_PRIORITY_CLASSES: Record<TaskPriority, string> = {
    [TaskPriority.LOW]: "bg-gray-400",
    [TaskPriority.MEDIUM]: "bg-amber-400",
    [TaskPriority.HIGH]: "bg-rose-400",
};

export const TaskType = {
    CALL: "CALL",
    MEETING: "MEETING",
    SITE_VISIT: "SITE_VISIT",
    FOLLOW_UP: "FOLLOW_UP",
    OTHER: "OTHER",
} as const;

export type TaskType = (typeof TaskType)[keyof typeof TaskType];

export const TASK_TYPE_LABEL_KEYS: Record<TaskType, string> = {
    [TaskType.CALL]: "tasks:type.call",
    [TaskType.MEETING]: "tasks:type.meeting",
    [TaskType.SITE_VISIT]: "tasks:type.site_visit",
    [TaskType.FOLLOW_UP]: "tasks:type.follow_up",
    [TaskType.OTHER]: "tasks:type.other",
};