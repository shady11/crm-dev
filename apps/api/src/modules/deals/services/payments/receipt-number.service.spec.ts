import {
  ReceiptNumberService,
  formatReceiptNumber,
} from './receipt-number.service';

describe('ReceiptNumberService', () => {
  it('formats R-YYYY-NNNN, padding to four digits but never truncating', () => {
    expect(formatReceiptNumber(2026, 7)).toBe('R-2026-0007');
    expect(formatReceiptNumber(2026, 12345)).toBe('R-2026-12345');
  });

  it('ensures the counter row, then takes the next number from the locked increment', async () => {
    const db = {
      $executeRaw: jest.fn().mockResolvedValue(0),
      $queryRaw: jest.fn().mockResolvedValue([{ lastSequence: 66 }]),
    };

    const number = await new ReceiptNumberService().next(
      db as any,
      'company-1',
    );

    expect(db.$executeRaw).toHaveBeenCalledTimes(1);
    expect(db.$queryRaw).toHaveBeenCalledTimes(1);
    expect(number).toBe(`R-${new Date().getFullYear()}-0066`);
  });
});
