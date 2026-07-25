import {IsOptional, IsString, MaxLength,} from 'class-validator';

export class CancelDealDto {
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    reason?: string;
}