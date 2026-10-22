/**
 * The last millisecond of "today" in the given IANA time zone (a company's
 * Company.timezone), so a date-only value picked in the browser - sent as
 * that day's UTC midnight - compares correctly against it. Falls back to the
 * server's own day when the zone is missing or not a name Intl accepts
 * (older rows hold values like "UTC+6").
 */
export function endOfToday(
  timeZone?: string | null,
  now: Date = new Date(),
): Date {
  if (!timeZone || !isValidTimeZone(timeZone)) {
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return end;
  }

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);

  const year = part('year');
  const month = part('month') - 1;
  const day = part('day');
  // The zone's offset right now: its wall-clock time read as if it were UTC,
  // minus the real instant (to the second, as formatToParts has no ms).
  const wallClockAsUtc = Date.UTC(
    year,
    month,
    day,
    part('hour'),
    part('minute'),
    part('second'),
  );
  const offsetMs = wallClockAsUtc - Math.floor(now.getTime() / 1000) * 1000;

  return new Date(Date.UTC(year, month, day + 1) - offsetMs - 1);
}

/**
 * Today's date in the given zone, stored the way a date picked in the
 * browser is: that day's UTC midnight. E2E-2: a deposit taken at
 * reservation is dated like a payment entered in the form, so the two sort
 * by day rather than by time of day.
 */
export function todayAsDate(
  timeZone?: string | null,
  now: Date = new Date(),
): Date {
  if (!timeZone || !isValidTimeZone(timeZone)) {
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  }

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);

  return new Date(Date.UTC(part('year'), part('month') - 1, part('day')));
}

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}
