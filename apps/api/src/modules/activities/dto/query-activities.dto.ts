import {IsDateString, IsEnum, IsIn, IsInt, IsOptional, IsUUID, Max, Min} from "class-validator";
import {Transform} from "class-transformer";
import {ActivityAction, ActivityType} from "@/generated/prisma/enums";

export const ACTIVITY_SUBJECTS = ["lead", "client", "deal", "task", "inventory"] as const;
export type ActivitySubject = (typeof ACTIVITY_SUBJECTS)[number];

export class QueryActivitiesDto {
    // Only rows about this kind of record ("inventory" = units, floors,
    // blocks, entrances and projects).
    @IsOptional()
    @IsIn(ACTIVITY_SUBJECTS)
    subject?: ActivitySubject;

    @IsOptional()
    @IsEnum(ActivityType)
    type?: ActivityType;

    @IsOptional()
    @IsEnum(ActivityAction)
    action?: ActivityAction;

    @IsOptional()
    @IsUUID()
    userId?: string;

    @IsOptional()
    @IsUUID()
    leadId?: string;

    @IsOptional()
    @IsUUID()
    clientId?: string;

    @IsOptional()
    @IsUUID()
    dealId?: string;

    // Admin-only cross-branch filter (mirrors BR-B3 on leads/clients) —
    // ignored server-side for a branch-scoped caller, whose own branch filter
    // already takes precedence.
    @IsOptional()
    @IsUUID()
    branchId?: string;

    @IsOptional()
    @IsDateString()
    dateFrom?: string;

    @IsOptional()
    @IsDateString()
    dateTo?: string;

    @IsOptional()
    @Transform(({value}) => Number(value))
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Transform(({value}) => Number(value))
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 20;
}
