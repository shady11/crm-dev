import type {ReservationPolicy} from "@/features/deals/api/deals.api";

const DAY_MS = 24 * 60 * 60 * 1000;

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

/**
 * The selectable range for a reservation expiry date, as `YYYY-MM-DD`.
 *
 * The forms send a picked day as `new Date("YYYY-MM-DD")`, i.e. midnight
 * UTC, and the API requires that instant to be after now and at most
 * reservationMaxDays from now. So both bounds are UTC calendar days: the
 * first is the day after today (UTC), the last is the UTC day of
 * now + reservationMaxDays — whose midnight is always within the limit.
 */
export function reservationDateBounds(policy: ReservationPolicy, now: Date = new Date()) {
    return {
        min: toIsoDate(new Date(now.getTime() + DAY_MS)),
        max: toIsoDate(new Date(now.getTime() + policy.reservationMaxDays * DAY_MS)),
    };
}

/** The company's default expiry, as the same midnight-UTC instant the picker produces. */
export function defaultReservationExpiry(policy: ReservationPolicy, now: Date = new Date()) {
    return new Date(toIsoDate(new Date(now.getTime() + policy.reservationDefaultDays * DAY_MS)));
}
