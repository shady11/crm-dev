import {InternalServerErrorException} from '@nestjs/common';

/**
 * The deal-number counter row was missing at the moment it was incremented.
 * This should be unreachable — the counter is seeded in the same transaction,
 * immediately before — so it means something outside the application deleted
 * the row. Raised explicitly so that case surfaces as a named error rather than
 * a TypeError on an undefined array element.
 */
export class DealNumberGenerationFailedException extends InternalServerErrorException {
    constructor(companyId: string, year: number) {
        super(`Could not allocate a deal number for company "${companyId}" (${year}).`);
    }
}
