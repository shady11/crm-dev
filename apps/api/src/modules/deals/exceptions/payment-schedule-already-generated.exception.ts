import {ConflictException} from '@nestjs/common';

export class PaymentScheduleAlreadyGeneratedException extends ConflictException {
    constructor() {
        super('Payment schedule has already been generated.');
    }
}