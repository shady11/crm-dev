import {IsDateString, IsOptional, IsString, MaxLength,} from 'class-validator';

export class SignContractDto {
    @IsString()
    @MaxLength(100)
    contractNumber: string;

    @IsDateString()
    contractDate: string;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    note?: string;
}