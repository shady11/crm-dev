import {IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min} from "class-validator";
import {Transform} from "class-transformer";
import {TaskStatus} from "@/generated/prisma/client";

// Columns the tasks table lets a user sort by — kept in sync with the
// column keys TasksTable passes to SortableTableHead on the frontend.
export const TASK_SORTABLE_FIELDS = ["title", "dueDate", "status"] as const;

export class QueryTasksDto {
    @IsOptional()
    @IsEnum(TaskStatus)
    status?: TaskStatus;

    @IsOptional()
    @IsUUID()
    assignedToId?: string;

    @IsOptional()
    @IsUUID()
    dealId?: string;

    @IsOptional()
    @IsUUID()
    clientId?: string;

    @IsOptional()
    @IsUUID()
    leadId?: string;

    // Admin-only cross-branch filter (BR-B3) — see leads' QueryLeadsDto for
    // the same pattern and reasoning.
    @IsOptional()
    @IsUUID()
    branchId?: string;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @Transform(({ value }) => value === "true" || value === true)
    @IsBoolean()
    overdue?: boolean;

    @IsOptional()
    @IsIn(TASK_SORTABLE_FIELDS)
    sortBy?: string;

    @IsOptional()
    @IsIn(["asc", "desc"])
    sortOrder?: "asc" | "desc";

    @IsOptional()
    @Transform(({ value }) => Number(value))
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Transform(({ value }) => Number(value))
    @IsInt()
    @Min(1)
    @Max(200)
    limit?: number = 20;
}