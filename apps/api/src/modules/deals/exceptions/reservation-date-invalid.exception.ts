import {BadRequestException} from '@nestjs/common';

export class ReservationDateInvalidException extends BadRequestException {
    constructor(message = 'Reservation expiration date must be in the future.') {
        super(message);
    }
}
