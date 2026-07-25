import {
    IsDateString,
    IsEnum,
    IsNumber,
    IsOptional,
    IsPositive,
    IsString,
    IsUUID,
    MaxLength,
    Min,
} from 'class-validator';

import {Type} from 'class-transformer';
import {FinancingType} from "@/generated/prisma/client";

export class ReserveUnitDto {
    @IsUUID()
    unitId: string;

    @IsUUID()
    clientId: string;

    @IsOptional()
    @IsUUID()
    managerId?: string;

    @IsOptional()
    @IsEnum(FinancingType)
    financingType?: FinancingType;

    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @IsPositive()
    salePrice: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    discountAmount?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    discountPercent?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    deposit?: number;

    @IsOptional()
    @IsDateString()
    reservationExpiresAt?: string;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    note?: string;
}