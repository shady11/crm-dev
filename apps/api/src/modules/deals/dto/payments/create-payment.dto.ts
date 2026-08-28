import {IsDateString, IsEnum, IsNumber, IsOptional, IsString, MaxLength,} from 'class-validator';

import {Type} from 'class-transformer';

import {PaymentMethod, PaymentType,} from '@/generated/prisma/client';

export class CreatePaymentDto {
    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    amount: number;

    @IsEnum(PaymentMethod)
    paymentMethod: PaymentMethod;

    @IsEnum(PaymentType)
    paymentType: PaymentType;

    @IsDateString()
    paidAt: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    reference?: string;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    note?: string;
}