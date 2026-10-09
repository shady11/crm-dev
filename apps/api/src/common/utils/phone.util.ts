import {Transform} from "class-transformer";

/** Country code assumed for a number typed without one. */
const DEFAULT_COUNTRY_CODE = "996";
const NATIONAL_LENGTH = 9;

/**
 * One spelling per number, so duplicate checks and uniqueness rules compare
 * like with like: "0555 123 456", "555-123-456" and "+996 555 12 34 56" are
 * all stored as "+996555123456". A number with an explicit "+" keeps its own
 * country code. Anything that doesn't look like a phone number is returned
 * trimmed, as typed, rather than guessed at.
 */
export function normalizePhone(raw: string): string {
    const trimmed = raw.trim();
    const digits = trimmed.replace(/\D/g, "");

    if (trimmed.startsWith("+") && digits.length >= 8) {
        return `+${digits}`;
    }
    if (digits.length === DEFAULT_COUNTRY_CODE.length + NATIONAL_LENGTH && digits.startsWith(DEFAULT_COUNTRY_CODE)) {
        return `+${digits}`;
    }
    if (digits.length === NATIONAL_LENGTH + 1 && digits.startsWith("0")) {
        return `+${DEFAULT_COUNTRY_CODE}${digits.slice(1)}`;
    }
    if (digits.length === NATIONAL_LENGTH) {
        return `+${DEFAULT_COUNTRY_CODE}${digits}`;
    }
    return trimmed;
}

/** Normalizes a phone field on an incoming DTO; leaves non-strings to validation. */
export const NormalizePhone = () =>
    Transform(({value}) => (typeof value === "string" ? normalizePhone(value) : value));
