import {IsEnum, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min} from "class-validator";
import {LeadLostReason, LeadStatus} from "@/generated/prisma/enums";
import {Transform} from "class-transformer";

export const LEAD_STATUS_OPEN = "OPEN";
export const LEAD_STATUS_FOLLOW_UP_OVERDUE = "FOLLOW_UP_OVERDUE";

// Columns the leads table lets a user sort by — kept in sync with the
// column keys LeadsTable passes to SortableTableHead on the frontend.
export const LEAD_SORTABLE_FIELDS = ["fullName", "status", "createdAt", "nextContactAt"] as const;

export class QueryLeadsDto {
    @IsOptional()
    @IsString()
    search?: string;

    // A status, or OPEN for every status but Converted and Lost: what "Open
    // leads" counts on the dashboard and My team, so their links match (SH-4).
    // FOLLOW_UP_OVERDUE: open leads whose next contact slipped (SH-6).
    @IsOptional()
    @IsIn([...Object.values(LeadStatus), LEAD_STATUS_OPEN, LEAD_STATUS_FOLLOW_UP_OVERDUE])
    status?: LeadStatus | typeof LEAD_STATUS_OPEN | typeof LEAD_STATUS_FOLLOW_UP_OVERDUE;

    @IsOptional()
    @IsString()
    source?: string;

    // SH-8: lost leads with this reason.
    @IsOptional()
    @IsEnum(LeadLostReason)
    lostReason?: LeadLostReason;

    @IsOptional()
    @IsUUID()
    managerId?: string;

    // Leads interested in this project (Lead.preferredProjectId).
    @IsOptional()
    @IsUUID()
    projectId?: string;

    // Admin-only cross-branch filter (BR-B3) — ignored for a branch-scoped
    // caller, whose own branch filter already takes precedence. Kept as a
    // separate query param rather than reusing the sales-role restriction.
    @IsOptional()
    @IsUUID()
    branchId?: string;

    @IsOptional()
    @IsIn(LEAD_SORTABLE_FIELDS)
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