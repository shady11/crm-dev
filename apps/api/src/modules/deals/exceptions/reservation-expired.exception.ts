import {ConflictException} from '@nestjs/common';

export class ReservationExpiredException extends ConflictException {
    constructor() {
        super('Reservation has expired.');
    }
}