import {ConflictException} from '@nestjs/common';

export class PaymentExceedsBalanceException extends ConflictException {
    constructor() {
        super('Payment exceeds remaining balance.');
    }
}