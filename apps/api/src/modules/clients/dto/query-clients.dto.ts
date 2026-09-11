import {IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min} from "class-validator";
import {Transform} from "class-transformer";

// Columns the clients table lets a user sort by — kept in sync with the
// column keys ClientsTable passes to SortableTableHead on the frontend.
export const CLIENT_SORTABLE_FIELDS = ["fullName", "phone", "email", "createdAt"] as const;

export class QueryClientsDto {
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsUUID()
    projectId?: string;

    // Admin-only cross-branch filter (BR-B3) — see leads' QueryLeadsDto for
    // the same pattern and reasoning.
    @IsOptional()
    @IsUUID()
    branchId?: string;

    @IsOptional()
    @IsIn(CLIENT_SORTABLE_FIELDS)
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