/**
 * Shared minimum-strength bar for every place a password is *set* (signup,
 * admin-assigned, self-service change) — not for login, where the only
 * requirement is "matches the stored hash". Kept in one place so the three
 * call sites (CreateUserDto, UpdateUserPasswordDto, ChangePasswordDto)
 * cannot drift apart.
 */
export const STRONG_PASSWORD_OPTIONS = {
  minLength: 8,
  minLowercase: 1,
  minUppercase: 1,
  minNumbers: 1,
  minSymbols: 0,
} as const;
