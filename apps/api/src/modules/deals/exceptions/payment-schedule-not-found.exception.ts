import {NotFoundException} from '@nestjs/common';

export class PaymentScheduleNotFoundException extends NotFoundException {
    constructor() {
        super('Payment schedule was not found.');
    }
}