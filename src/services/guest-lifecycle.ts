// Pure guest-mode copies of what the database does for signed-in users (the `attempts_lifecycle`
// and `checkins_sync_attempt_status` triggers), so local attempts carry the same timestamps and the
// shared rules in checkin-rules.ts work on both. Unit tested with node --test.

export type LifecycleAttempt = {
  status: string;
  started_at: string | null;
  completed_at: string | null;
  dropped_at: string | null;
  updated_at: string;
};

/** Any direction is allowed; the timestamps follow it, as in `attempts_lifecycle`. */
export function withStatus<T extends LifecycleAttempt>(attempt: T, status: string, now: string): T {
  if (status === attempt.status) return attempt;
  const next = { ...attempt, status, updated_at: now };
  switch (status) {
    case 'planned':
      return { ...next, started_at: null, completed_at: null, dropped_at: null };
    case 'active':
      return { ...next, started_at: attempt.started_at ?? now, completed_at: null, dropped_at: null };
    case 'completed':
      return { ...next, started_at: attempt.started_at ?? now, completed_at: now, dropped_at: null };
    case 'dropped':
      return { ...next, dropped_at: now, completed_at: null };
    default:
      throw new Error(`Unknown status: ${status}`);
  }
}

/** The first check-in on a planned attempt makes it active (`checkins_sync_attempt_status`). */
export function afterFirstCheckin<T extends LifecycleAttempt>(attempt: T, now: string): T {
  return attempt.status === 'planned' ? withStatus(attempt, 'active', now) : attempt;
}

/** A unique-key clash, shaped like the Postgres error the remote services throw. */
export class DuplicateError extends Error {
  code = '23505';
}
