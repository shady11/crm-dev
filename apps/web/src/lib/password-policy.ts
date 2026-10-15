/**
 * The API's rule for setting a password (STRONG_PASSWORD_OPTIONS in
 * apps/api/src/common/constants/password-policy.constants.ts): at least 8
 * characters, with an uppercase letter, a lowercase letter and a digit.
 * Checked in the form too, so a weak password is caught before the request
 * instead of coming back as a generic error. Not for login, which only has
 * to match the stored hash.
 */
export function isStrongPassword(value: string): boolean {
    return value.length >= 8 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /[0-9]/.test(value);
}
