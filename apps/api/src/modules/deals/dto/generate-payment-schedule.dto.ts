import {IsDateString, IsInt, IsOptional, Min,} from 'class-validator';

import {Type} from 'class-transformer';

export class GeneratePaymentScheduleDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    installments: number;

    @IsDateString()
    firstPaymentDate: string;

    @IsOptional()
    @Type(() => Number)
    @Min(1)
    intervalMonths?: number = 1;
}