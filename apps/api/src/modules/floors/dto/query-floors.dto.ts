import {
    IsInt,
    IsOptional,
    Max,
    Min,
} from "class-validator";
import { Transform } from "class-transformer";

export class QueryFloorsDto {
    @IsOptional()
    @Transform(({ value }) => Number(value))
    @IsInt()
    @Min(-10)
    number?: number;

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
    limit?: number = 50;
}