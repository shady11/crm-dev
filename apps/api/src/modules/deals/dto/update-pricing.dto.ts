import {IsNumber, IsOptional, IsPositive, Min,} from 'class-validator';

import {Type} from 'class-transformer';

export class UpdatePricingDto {
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
}