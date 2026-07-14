import { IsArray, ValidateNested, IsString, IsNumber, IsOptional, IsEnum } from "class-validator";
import { Type } from "class-transformer";
import { UnitType, UnitStatus } from "@/generated/prisma/enums";

class UnitItem {
    @IsString()
    number!: string;

    @IsEnum(UnitType)
    @IsOptional()
    type?: UnitType;

    @IsNumber()
    area!: number;

    @IsNumber()
    price!: number;

    @IsNumber()
    @IsOptional()
    rooms?: number;
}

export class CreateUnitsBulkDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => UnitItem)
    units!: UnitItem[];
}