import {ConflictException} from '@nestjs/common';

export class UnitNotAvailableException extends ConflictException {
    constructor(unitNumber: string) {
        super(`Unit "${unitNumber}" is not available.`);
    }
}