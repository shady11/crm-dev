import {BadRequestException} from '@nestjs/common';

export class SalePriceMismatchException extends BadRequestException {
    constructor(expected: number, submitted: number) {
        super(
            `Sale price does not match the expected discount calculation. ` +
            `Expected ${expected}, received ${submitted}.`
        );
    }
}