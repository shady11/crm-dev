import {Prisma} from '@/generated/prisma/client';
import {dealStatusTitle, formatMoney} from './deal.constants';

describe('notification wording', () => {
    it('names a deal status in words, not as the enum value', () => {
        expect(dealStatusTitle('D-2026-0001', 'CONTRACT_SIGNED')).toBe('Deal D-2026-0001: contract signed');
        expect(dealStatusTitle('D-2026-0001', 'CANCELLED')).toBe('Deal D-2026-0001: cancelled');
    });

    it('formats money in the company currency', () => {
        expect(formatMoney(new Prisma.Decimal('3693.33'), 'KGS')).toBe('3,693.33 KGS');
        expect(formatMoney(1500, null)).toBe('1,500.00');
    });
});
