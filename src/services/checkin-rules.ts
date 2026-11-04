// Pure check-in helpers (no Supabase), so they can be unit tested with node --test.

export type CheckinResult = 'tried' | 'skipped';

export type CheckinDay = {
  local_date: string; // YYYY-MM-DD in the user's time zone
  result: string;
};

/** The device's calendar date as YYYY-MM-DD (not UTC). */
export function toLocalDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Whole days from `a` to `b` (both YYYY-MM-DD). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/**
 * True when the two latest check-ins are skips on back-to-back days, so the app can gently
 * ask what to do (keep going, pause, drop). Pass `today` to ignore an old pair of skips:
 * the latest skip must then be today or yesterday.
 */
export function shouldAskAfterSkips(checkins: readonly CheckinDay[], today?: string): boolean {
  const [latest, previous] = [...checkins].sort((x, y) => y.local_date.localeCompare(x.local_date));
  if (!latest || !previous) return false;
  if (latest.result !== 'skipped' || previous.result !== 'skipped') return false;
  if (daysBetween(previous.local_date, latest.local_date) !== 1) return false;
  if (today !== undefined) {
    const sinceLatest = daysBetween(latest.local_date, today);
    if (sinceLatest < 0 || sinceLatest > 1) return false;
  }
  return true;
}
