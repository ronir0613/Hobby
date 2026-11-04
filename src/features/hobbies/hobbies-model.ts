// Pure helpers for My hobbies (no Supabase), so they can be unit tested with node --test.

export type AttemptStatus = 'planned' | 'active' | 'completed' | 'dropped';

export const ATTEMPT_STATUSES: readonly AttemptStatus[] = ['planned', 'active', 'completed', 'dropped'];

export const STATUS_LABELS: Record<AttemptStatus, string> = {
  planned: 'Planned',
  active: 'Active',
  completed: 'Completed',
  dropped: 'Dropped',
};

/** How each status is reached. The app sets status from check-ins; the user never picks it. */
export const STATUS_DESCRIPTIONS: Record<AttemptStatus, string> = {
  planned: 'Not started yet',
  active: 'You’ve checked in at least once',
  completed: 'Tried on 7 days',
  dropped: 'Skipped two days in a row',
};

/** Active and planned first, then completed, then dropped; newest first within each. */
export function sortAttempts<T extends { status: string; created_at: string }>(attempts: readonly T[]): T[] {
  const rank = (status: string) => {
    const index = ['active', 'planned', 'completed', 'dropped'].indexOf(status);
    return index === -1 ? 4 : index;
  };
  return [...attempts].sort((a, b) => rank(a.status) - rank(b.status) || b.created_at.localeCompare(a.created_at));
}
