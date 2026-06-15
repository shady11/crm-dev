import {
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    Min,
} from "class-validator";
import { Transform } from "class-transformer";
import { UnitStatus, UnitType } from "@/generated/prisma/enums";

export class QueryUnitsDto {
    @IsOptional()
    @IsUUID()
    projectId?: string;

    @IsOptional()
    @IsUUID()
    blockId?: string;

    @IsOptional()
    @IsUUID()
    entranceId?: string;

    @IsOptional()
    @IsUUID()
    floorId?: string;

    @IsOptional()
    @IsString()
    search?: string;

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