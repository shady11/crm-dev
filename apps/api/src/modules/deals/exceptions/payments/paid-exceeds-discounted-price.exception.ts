import {ConflictException} from '@nestjs/common';

export class PaidExceedsDiscountedPriceException extends ConflictException {
    constructor() {
        super('The client has already paid more than the discounted price. Refund the difference before approving the discount.');
    }
}
