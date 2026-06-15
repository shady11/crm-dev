import {
    IsEnum,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    Min,
    MinLength,
} from "class-validator";
import { Type } from "class-transformer";
import { UnitStatus, UnitType } from "@/generated/prisma/enums";

export class CreateUnitDto {
    @IsString()
    @MinLength(1)
    number!: string;

    @IsOptional()
    @IsEnum(UnitType)
    type?: UnitType;

    @IsOptional()
    @IsEnum(UnitStatus)
    status?: UnitStatus;

    @IsOptional()
    @IsInt()
    @Min(0)
    rooms?: number;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    square!: number;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    price!: number;
}