import {IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min,} from 'class-validator';
import {DealStatus} from "@/generated/prisma/client";
import {Transform} from "class-transformer";

export class DealQueryDto {
    @IsOptional()
    @IsEnum(DealStatus)
    status?: DealStatus;

    @IsOptional()
    @IsUUID()
    projectId?: string;

    @IsOptional()
    @IsUUID()
    managerId?: string;

    @IsOptional()
    @IsUUID()
    clientId?: string;

    // Admin-only cross-branch filter (BR-B3) — see leads' QueryLeadsDto for
    // the same pattern and reasoning.
    @IsOptional()
    @IsUUID()
    branchId?: string;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @Transform(({ value }) => Number(value))
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Transform(({ value }) => Number(value))
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 20;
}