import {DealNumberService} from './deal-number.service';
import {DealNumberGenerationFailedException} from '../exceptions';

/**
 * Deal numbers must never collide or repeat, even under concurrent
 * reservations — that's what the raw SQL upsert-then-row-locked-increment
 * is for. These tests pin down the format, the zero-padding, and the
 * defensive fallback if the row-locked UPDATE ever comes back empty.
 */
describe('DealNumberService.generateDealNumber', () => {
    function build(lastSequence: number | undefined) {
        const db = {
            $executeRaw: jest.fn().mockResolvedValue(1),
            $queryRaw: jest.fn().mockResolvedValue(lastSequence === undefined ? [] : [{lastSequence}]),
        };
        const service = new DealNumberService();
        return {service, db};
    }

    it('formats the deal number as D-<year>-<4-digit zero-padded sequence>', async () => {
        const {service, db} = build(7);
        const year = new Date().getFullYear();

        const result = await service.generateDealNumber(db as any, 'company-1');

        expect(result).toBe(`D-${year}-0007`);
    });

    it('does not zero-pad beyond 4 digits once the sequence grows past it', async () => {
        const {service, db} = build(12345);
        const year = new Date().getFullYear();

        const result = await service.generateDealNumber(db as any, 'company-1');

        expect(result).toBe(`D-${year}-12345`);
    });

    it('seeds the per-company/year counter before incrementing it', async () => {
        const {service, db} = build(1);
        await service.generateDealNumber(db as any, 'company-1');

        const seedCall = db.$executeRaw.mock.invocationCallOrder[0];
        const incrementCall = db.$queryRaw.mock.invocationCallOrder[0];
        expect(seedCall).toBeLessThan(incrementCall);
    });

    it('throws DealNumberGenerationFailedException if the row-locked update unexpectedly returns nothing', async () => {
        const {service, db} = build(undefined);
        await expect(service.generateDealNumber(db as any, 'company-1')).rejects.toThrow(
            DealNumberGenerationFailedException,
        );
    });
});
