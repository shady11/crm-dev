import {IsEnum, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min,} from 'class-validator';
import {DealStatus} from "@/generated/prisma/client";
import {Transform} from "class-transformer";

// Columns the deals table lets a user sort by — kept in sync with the
// column keys DealsTable passes to SortableTableHead on the frontend.
export const DEAL_SORTABLE_FIELDS = ["dealNumber", "status", "salePrice", "createdAt"] as const;

// The dashboard's "Needs attention" queues, as list filters, so "View all"
// opens the same set of deals the dashboard counted (see
// DashboardService.getAttentionItems for the definitions).
export const DEAL_ATTENTION_FILTERS = ["discount_pending", "overdue_payments"] as const;
export type DealAttentionFilter = typeof DEAL_ATTENTION_FILTERS[number];

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
    @IsIn(DEAL_ATTENTION_FILTERS)
    attention?: DealAttentionFilter;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsIn(DEAL_SORTABLE_FIELDS)
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
    @Max(100)
    limit?: number = 20;
}