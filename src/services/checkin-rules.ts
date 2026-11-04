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

/** Today and yesterday on the device calendar, as YYYY-MM-DD. */
export function checkinDays(now: Date = new Date()) {
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  return { today: toLocalDate(now), yesterday: toLocalDate(yesterday) };
}

/** "Today", "Yesterday", or a short date such as "Mon, 2 Nov". */
export function dayLabel(localDate: string, now: Date = new Date()): string {
  const { today, yesterday } = checkinDays(now);
  if (localDate === today) return 'Today';
  if (localDate === yesterday) return 'Yesterday';
  const [y, m, d] = localDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

/** One short line for a card, e.g. "Tried today" or "Skipped yesterday". */
export function latestCheckinLine(checkins: readonly CheckinDay[], now: Date = new Date()): string | null {
  const latest = [...checkins].sort((x, y) => y.local_date.localeCompare(x.local_date))[0];
  if (!latest) return null;
  const verb = latest.result === 'tried' ? 'Tried' : 'Skipped';
  const label = dayLabel(latest.local_date, now);
  return label === 'Today' || label === 'Yesterday' ? `${verb} ${label.toLowerCase()}` : `${verb} on ${label}`;
}

/** A hobby is completed on its 7th tried day (skips in between don't reset the count). */
export const TRIED_DAYS_TO_COMPLETE = 7;

export type RunCheckin = CheckinDay & { created_at: string };

/**
 * The check-ins that belong to the current go. "Give it another go" moves the attempt back to
 * planned, which clears started_at; the next check-in sets it again (same transaction, so the
 * check-in's created_at equals started_at). Older check-ins stay as history but no longer count.
 */
export function currentRun<T extends RunCheckin>(checkins: readonly T[], startedAt: string | null): T[] {
  if (!startedAt) return [];
  const start = Date.parse(startedAt);
  return checkins.filter((c) => Date.parse(c.created_at) >= start);
}

/**
 * Status follows the check-ins of the current go: 7 tried days → completed; two skipped days in a
 * row (the latest two answers) → dropped; otherwise unchanged. Completed and dropped stay put
 * until the user gives it another go.
 */
export function statusAfterCheckins(status: string, run: readonly CheckinDay[]): string {
  if (status !== 'active') return status;
  if (run.filter((c) => c.result === 'tried').length >= TRIED_DAYS_TO_COMPLETE) return 'completed';
  if (shouldAskAfterSkips(run)) return 'dropped';
  return status;
}
