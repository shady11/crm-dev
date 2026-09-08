import {IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min} from "class-validator";
import {Transform} from "class-transformer";
import {TaskStatus} from "@/generated/prisma/client";

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