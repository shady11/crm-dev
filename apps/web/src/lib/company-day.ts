/**
 * Today's date (YYYY-MM-DD) where the company is, not where the browser is.
 *
 * Payment and contract dates are stored as the company's calendar day, and
 * the API checks "not in the future" against the company's today. A browser
 * on another clock (a laptop left on UTC, a manager travelling) put "this
 * month" and the date pickers on a different day: just after midnight in
 * Bishkek, the payments page ended its month on yesterday and showed none of
 * today's deposits, while the dashboard counted them.
 */
export function companyToday(timeZone?: string | null, now: Date = new Date()): string {
    if (timeZone) {
        try {
            const parts = new Intl.DateTimeFormat("en-US", {
                timeZone,
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            }).formatToParts(now);
            const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value;
            return `${part("year")}-${part("month")}-${part("day")}`;
        } catch {
            // An unknown zone name: fall through to the browser's own day.
        }
    }
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 10);
}
