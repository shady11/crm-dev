import { IsEnum, IsInt, IsNumber, IsOptional, IsUUID, Min } from "class-validator";
import { Transform } from "class-transformer";
import { UnitStatus, UnitType } from "@/generated/prisma/enums";

export class QueryChessboardDto {
    @IsOptional()
    @IsUUID()
    blockId?: string;

    @IsOptional()
    @IsUUID()
    entranceId?: string;

    @IsOptional()
    @IsEnum(UnitType)
    type?: UnitType;

    @IsOptional()
    @IsEnum(UnitStatus)
    status?: UnitStatus;

    @IsOptional()
    @Transform(({ value }) => Number(value))
    @IsInt()
    @Min(0)
    rooms?: number;

    @IsOptional()
    @Transform(({ value }) => Number(value))
    @IsNumber()
    @Min(0)
    areaMin?: number;

    @IsOptional()
    @Transform(({ value }) => Number(value))
    @IsNumber()
    @Min(0)
    areaMax?: number;

    @IsOptional()
    @Transform(({ value }) => Number(value))
    @IsNumber()
    @Min(0)
    priceMin?: number;

    @IsOptional()
    @Transform(({ value }) => Number(value))
    @IsNumber()
    @Min(0)
    priceMax?: number;
}