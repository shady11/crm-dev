import {IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min} from "class-validator";
import {Transform} from "class-transformer";
import {UserRole} from "@/generated/prisma/enums";

// Columns the users table lets a user sort by — kept in sync with the
// column keys UsersTable passes to SortableTableHead on the frontend.
export const USER_SORTABLE_FIELDS = ["fullName", "role", "createdAt"] as const;

export class QueryUsersDto {
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;

    @IsOptional()
    @IsString()
    branchId?: string;

    @IsOptional()
    @Transform(({ value }) => {
        if (value === undefined) return undefined;
        if (typeof value === "boolean") return value;
        return value === "true";
    })
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsIn(USER_SORTABLE_FIELDS)
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