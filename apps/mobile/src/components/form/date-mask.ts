/**
 * Kept dependency-free (no RN/`@expo/vector-icons` imports) so it can be unit
 * tested directly — importing `date-field.tsx` here would pull in
 * `@expo/vector-icons`, which the mobile app's jest config does not
 * transform when resolved through pnpm's `@expo+vector-icons@…` store dir.
 */

/** Digits-only input, auto-inserting the `YYYY-MM-DD` dashes as the user types. */
export function maskIsoDate(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  const year = digits.slice(0, 4);
  const month = digits.slice(4, 6);
  const day = digits.slice(6, 8);
  return [year, month, day].filter(Boolean).join('-');
}
