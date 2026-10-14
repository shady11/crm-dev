import {IsDateString, IsOptional, IsString, MaxLength} from 'class-validator';

export class ExtendReservationDto {
    @IsDateString()
    reservationExpiresAt: string;

    // SH-11: required when the extension goes past the company's limit.
    @IsOptional()
    @IsString()
    @MaxLength(500)
    reason?: string;
}
