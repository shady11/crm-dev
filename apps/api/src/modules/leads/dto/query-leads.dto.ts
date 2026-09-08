import {IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min} from "class-validator";
import {LeadStatus} from "@/generated/prisma/enums";
import {Transform} from "class-transformer";

export class QueryLeadsDto {
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsEnum(LeadStatus)
    status?: LeadStatus;

    @IsOptional()
    @IsString()
    source?: string;

    @IsOptional()
    @IsUUID()
    managerId?: string;

    // Admin-only cross-branch filter (BR-B3) — ignored for a branch-scoped
    // caller, whose own branch filter already takes precedence. Kept as a
    // separate query param rather than reusing the sales-role restriction.
    @IsOptional()
    @IsUUID()
    branchId?: string;

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