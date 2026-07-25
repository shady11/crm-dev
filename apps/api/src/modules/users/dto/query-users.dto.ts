import {IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min} from "class-validator";
import {Transform} from "class-transformer";
import {UserRole} from "@/generated/prisma/enums";

export class QueryUsersDto {
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;

    @IsOptional()
    @Transform(({ value }) => {
        if (value === undefined) return undefined;
        if (typeof value === "boolean") return value;
        return value === "true";
    })
    @IsBoolean()
    isActive?: boolean;

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