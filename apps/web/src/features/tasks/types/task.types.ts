export const TaskStatus = {
    TODO: "TODO",
    IN_PROGRESS: "IN_PROGRESS",
    DONE: "DONE",
    CANCELLED: "CANCELLED",
} as const;

export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
    [TaskStatus.TODO]: "To do",
    [TaskStatus.IN_PROGRESS]: "In progress",
    [TaskStatus.DONE]: "Done",
    [TaskStatus.CANCELLED]: "Cancelled",
};

export const TASK_STATUS_CLASSES: Record<TaskStatus, string> = {
    [TaskStatus.TODO]: "bg-gray-400",
    [TaskStatus.IN_PROGRESS]: "bg-blue-400",
    [TaskStatus.DONE]: "bg-emerald-400",
    [TaskStatus.CANCELLED]: "bg-rose-400",
};