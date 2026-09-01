import type {Block} from "@/features/blocks/types/block.types.ts";

export const ProjectStatus = {
    DRAFT: "DRAFT",
    PLANNING: "PLANNING",
    ACTIVE: "ACTIVE",
    PAUSED: "PAUSED",
    SOLDOUT: "SOLDOUT",
    COMPLETED: "COMPLETED",
    ARCHIVED: "ARCHIVED",
} as const;

export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];

export const PROJECT_STATUS_VALUES = [
    ProjectStatus.DRAFT,
    ProjectStatus.PLANNING,
    ProjectStatus.ACTIVE,
    ProjectStatus.PAUSED,
    ProjectStatus.SOLDOUT,
    ProjectStatus.COMPLETED,
    ProjectStatus.ARCHIVED,
] as const;

export const PROJECT_STATUS_LABEL_KEYS: Record<ProjectStatus, string> = {
    [ProjectStatus.DRAFT]: "projects:status.draft",
    [ProjectStatus.PLANNING]: "projects:status.planning",
    [ProjectStatus.ACTIVE]: "projects:status.active",
    [ProjectStatus.PAUSED]: "projects:status.paused",
    [ProjectStatus.SOLDOUT]: "projects:status.sold_out",
    [ProjectStatus.COMPLETED]: "projects:status.completed",
    [ProjectStatus.ARCHIVED]: "projects:status.archived",
};

export const PROJECT_STATUS_BADGE_CLASSES: Record<ProjectStatus, string> = {
    [ProjectStatus.DRAFT]: "bg-gray-400",
    [ProjectStatus.PLANNING]: "bg-amber-400",
    [ProjectStatus.ACTIVE]: "bg-emerald-400",
    [ProjectStatus.PAUSED]: "bg-cyan-400",
    [ProjectStatus.SOLDOUT]: "bg-indigo-400",
    [ProjectStatus.COMPLETED]: "bg-blue-400",
    [ProjectStatus.ARCHIVED]: "bg-slate-400",
};

export function isProjectStatus(status?: string | null): status is ProjectStatus {
    const normalizedStatus = status?.trim().toUpperCase();

    return PROJECT_STATUS_VALUES.some((value) => value === normalizedStatus);
}

export function normalizeProjectStatus(status?: string | null): ProjectStatus {
    const normalizedStatus = status?.trim().toUpperCase();

    return isProjectStatus(normalizedStatus)
        ? normalizedStatus
        : ProjectStatus.ACTIVE;
}

export type Project = {
    id: string;
    name: string;
    address: string | null;
    status: ProjectStatus;
    companyId: string;
    createdAt: string;
    updatedAt: string;
    blocks: Block[];
    _count?: {
        blocks: number;
        units: number;
    };
};

export type ProjectTree = {
    id: string;
    name: string;
    blocks: Block[];
};
