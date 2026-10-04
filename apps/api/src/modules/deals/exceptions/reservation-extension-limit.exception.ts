import {ConflictException} from '@nestjs/common';

export class ReservationExtensionLimitException extends ConflictException {
    constructor(maxExtensions: number) {
        super(
            `Reservation has already been extended the maximum of ${maxExtensions} time(s). ` +
            'Sign the contract or let the reservation expire.',
        );
    }
}
