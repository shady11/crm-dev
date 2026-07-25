import {IsDateString} from 'class-validator';

export class ExtendReservationDto {
    @IsDateString()
    reservationExpiresAt: string;
}