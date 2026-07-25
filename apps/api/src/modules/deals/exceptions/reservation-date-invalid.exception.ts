import {BadRequestException} from '@nestjs/common';

export class ReservationDateInvalidException extends BadRequestException {
    constructor() {
        super('Reservation expiration date must be in the future.');
    }
}