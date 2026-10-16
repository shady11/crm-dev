import { randomBytes } from 'crypto';

/**
 * Shared minimum-strength bar for every place a password is *set* (signup,
 * admin-assigned, self-service change, a new company's first admin, the
 * provisioning script) — not for login, where the only requirement is
 * "matches the stored hash". Kept in one place so they cannot drift apart
 * (SA-6: the company admin and the script used to accept "password123").
 */
export const STRONG_PASSWORD_OPTIONS = {
  minLength: 8,
  minLowercase: 1,
  minUppercase: 1,
  minNumbers: 1,
  minSymbols: 0,
} as const;

/** Whether a password meets STRONG_PASSWORD_OPTIONS (for code paths without a DTO). */
export function isStrongPassword(password: string): boolean {
  return (
    password.length >= STRONG_PASSWORD_OPTIONS.minLength &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

/**
 * A random password that always meets the policy: 24 URL-safe characters,
 * drawn again in the rare case one lacks a digit or a letter case.
 */
export function generateStrongPassword(): string {
  for (;;) {
    const candidate = randomBytes(18).toString('base64url');
    if (isStrongPassword(candidate)) return candidate;
  }
}
