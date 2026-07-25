import {ConflictException} from '@nestjs/common';

export class ActiveDealExistsException extends ConflictException {
    constructor(unitNumber: string) {
        super(`Unit "${unitNumber}" already has an active deal.`);
    }
}