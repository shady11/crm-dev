import {ConflictException} from '@nestjs/common';

export class InvalidDealStateException extends ConflictException {
    constructor(current: string, expected: string | string[]) {
        const allowed = Array.isArray(expected)
            ? expected.join(', ')
            : expected;

        super(
            `Invalid deal state "${current}". Expected: ${allowed}.`,
        );
    }
}