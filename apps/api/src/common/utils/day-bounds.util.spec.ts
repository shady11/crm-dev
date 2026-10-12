import { endOfToday } from './day-bounds.util';

describe('endOfToday', () => {
  it("ends the company's day in its own zone, not the server's", () => {
    // 03:00 on 13 Oct in Bishkek (UTC+6) is still 12 Oct in UTC.
    const now = new Date('2026-10-12T21:00:00Z');

    expect(endOfToday('Asia/Bishkek', now).toISOString()).toBe(
      '2026-10-13T17:59:59.999Z',
    );
  });

  it("accepts the UTC-midnight date the browser sends for today, and refuses tomorrow's", () => {
    const now = new Date('2026-10-12T21:00:00Z'); // 13 Oct, 03:00 in Bishkek
    const end = endOfToday('Asia/Bishkek', now);

    expect(new Date('2026-10-13T00:00:00Z') <= end).toBe(true);
    expect(new Date('2026-10-14T00:00:00Z') <= end).toBe(false);
  });

  it('works for zones behind UTC', () => {
    const now = new Date('2026-10-13T02:00:00Z'); // 12 Oct, 22:00 in New York (UTC-4)

    expect(endOfToday('America/New_York', now).toISOString()).toBe(
      '2026-10-13T03:59:59.999Z',
    );
  });

  it("falls back to the server's day for a missing or non-IANA zone", () => {
    const now = new Date(2026, 9, 12, 10, 0, 0);
    const serverEnd = new Date(2026, 9, 12, 23, 59, 59, 999);

    expect(endOfToday(null, now)).toEqual(serverEnd);
    expect(endOfToday('UTC+6', now)).toEqual(serverEnd);
  });
});
