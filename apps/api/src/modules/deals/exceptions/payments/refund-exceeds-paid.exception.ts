import {ConflictException} from '@nestjs/common';

export class RefundExceedsPaidException extends ConflictException {
    constructor() {
        super('Refund amount exceeds what has been paid on this deal.');
    }
}