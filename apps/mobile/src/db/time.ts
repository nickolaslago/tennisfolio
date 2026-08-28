/**
 * Timestamps and dates, in the two string formats the local schema stores.
 *
 * Both are ISO-8601 and both sort lexicographically, which is what lets the
 * repositories `ORDER BY` and range-filter on them without any conversion.
 * Timestamps are always UTC — a phone that crosses a timezone must not reorder
 * its own history, and a future sync engine compares `updated_at` across
 * devices.
 */

/** Now, as `YYYY-MM-DDTHH:MM:SS.sssZ`. Matches the tombstone triggers' format. */
export function nowIso(): string {
  return new Date().toISOString();
}

/** The `YYYY-MM-DD` date part of an ISO timestamp or date string. */
export function toIsoDate(value: string): string {
  return value.slice(0, 10);
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Whether a string is a well-formed, real `YYYY-MM-DD` calendar date. */
export function isIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}
