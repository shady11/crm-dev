import type {Block} from "@/features/blocks/types/block.types.ts";

export const ProjectStatus = {
    Draft: "draft",
    Planning: "planning",
    Active: "active",
    Paused: "paused",
    SoldOut: "sold_out",
    Completed: "completed",
    Archived: "archived",
} as const;

export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];

export const PROJECT_STATUS_VALUES = [
    ProjectStatus.Draft,
    ProjectStatus.Planning,
    ProjectStatus.Active,
    ProjectStatus.Paused,
    ProjectStatus.SoldOut,
    ProjectStatus.Completed,
    ProjectStatus.Archived,
] as const;

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
    [ProjectStatus.Draft]: "Draft",
    [ProjectStatus.Planning]: "Planning",
    [ProjectStatus.Active]: "Active",
    [ProjectStatus.Paused]: "Paused",
    [ProjectStatus.SoldOut]: "Sold out",
    [ProjectStatus.Completed]: "Completed",
    [ProjectStatus.Archived]: "Archived",
};

export const PROJECT_STATUS_BADGE_CLASSES: Record<ProjectStatus, string> = {
    [ProjectStatus.Draft]: "bg-gray-500",
    [ProjectStatus.Planning]: "bg-amber-500",
    [ProjectStatus.Active]: "bg-emerald-500",
    [ProjectStatus.Paused]: "bg-cyan-500",
    [ProjectStatus.SoldOut]: "bg-indigo-500",
    [ProjectStatus.Completed]: "bg-blue-500",
    [ProjectStatus.Archived]: "bg-slate-500",
};

export function isProjectStatus(status?: string | null): status is ProjectStatus {
    const normalizedStatus = status?.trim().toLowerCase();

    return PROJECT_STATUS_VALUES.some((value) => value === normalizedStatus);
}

export function normalizeProjectStatus(status?: string | null): ProjectStatus {
    const normalizedStatus = status?.trim().toLowerCase();

    return isProjectStatus(normalizedStatus)
        ? normalizedStatus
        : ProjectStatus.Active;
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
