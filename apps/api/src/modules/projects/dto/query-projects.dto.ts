import {IsEnum, IsInt, IsOptional, IsString, Max, Min,} from "class-validator";
import {Transform} from "class-transformer";
import {ProjectStatus} from "@/generated/prisma/enums";

export class QueryProjectsDto {
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsEnum(ProjectStatus)
    status?: ProjectStatus;

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