import {IsBoolean, IsInt, IsOptional, Max, Min} from "class-validator";
import {Transform} from "class-transformer";

export class QueryNotificationsDto {
    @IsOptional()
    @Transform(({ value }) => value === "true" || value === true)
    @IsBoolean()
    isRead?: boolean;

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