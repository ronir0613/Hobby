// Pure rules for moving a guest's phone data onto an account (no Expo, no Supabase),
// unit tested with node --test. The runner is `guest-sync.ts`.
//
// Retry safety: every guest row keeps its UUID in the cloud, so a second run can tell what is
// already there. A guest attempt found in the cloud under its own id (a run that stopped halfway)
// is treated like an account attempt: only the days it is missing are added.

import { currentRun, type CheckinResult } from './checkin-rules.ts';
import { buildMediaPath } from './media-path.ts';

export type MergeAttempt = {
  id: string;
  interest_id: string | null;
  status: string;
  started_at: string | null;
};
export type MergeCheckin = {
  id: string;
  attempt_id: string;
  local_date: string;
  result: CheckinResult;
  created_at: string;
};
export type MergeNote = { id: string; attempt_id: string; content: string };
export type MergePhoto = { id: string; attempt_id: string; storage_path: string; file_size: number };

export type GuestSnapshot<A extends MergeAttempt = MergeAttempt> = {
  attempts: readonly A[];
  checkins: readonly MergeCheckin[];
  notes: readonly MergeNote[];
  photos: readonly MergePhoto[];
};

export type CloudSnapshot = {
  attempts: readonly Pick<MergeAttempt, 'id' | 'interest_id'>[];
  checkins: readonly { attempt_id: string; local_date: string }[];
};

/** One write against the account, in order. */
export type AttemptStep =
  | { op: 'insert-attempt'; id: string; interest_id: string | null }
  | { op: 'insert-checkins'; checkins: { id: string; local_date: string; result: CheckinResult }[] }
  | { op: 'set-status'; status: string };

export type AttemptMergePlan<A extends MergeAttempt = MergeAttempt> = {
  guest: A;
  /** 'create': the account has no attempt for this interest. 'join': it does, and it wins. */
  kind: 'create' | 'join';
  /** The account attempt the guest's days, notes and photos end up on. */
  targetId: string;
  steps: AttemptStep[];
  notes: { id: string; content: string }[];
  photos: { id: string; localPath: string; cloudPath: string; file_size: number }[];
};

const byDateThenCreated = (a: MergeCheckin, b: MergeCheckin) =>
  a.local_date.localeCompare(b.local_date) || a.created_at.localeCompare(b.created_at);

const toInsert = (c: MergeCheckin) => ({ id: c.id, local_date: c.local_date, result: c.result });

/**
 * Writes that rebuild a guest attempt on the account so the status rules see the same "go":
 * the database stamps started_at on the first check-in (one insert = one transaction, so a batch
 * shares that time), and moving back to planned clears it. So: days from earlier goes first,
 * back to planned, then the current go's days, then the guest's own status.
 */
export function createSteps(attempt: MergeAttempt, checkins: readonly MergeCheckin[]): AttemptStep[] {
  const sorted = [...checkins].sort(byDateThenCreated);
  const run = currentRun(sorted, attempt.started_at);
  const inRun = new Set(run.map((c) => c.id));
  const earlier = sorted.filter((c) => !inRun.has(c.id));

  const steps: AttemptStep[] = [{ op: 'insert-attempt', id: attempt.id, interest_id: attempt.interest_id }];
  let status = 'planned';
  if (earlier.length > 0) {
    steps.push({ op: 'insert-checkins', checkins: earlier.map(toInsert) });
    status = 'active';
    if (run.length > 0) {
      steps.push({ op: 'set-status', status: 'planned' });
      status = 'planned';
    }
  }
  if (run.length > 0) {
    steps.push({ op: 'insert-checkins', checkins: run.map(toInsert) });
    status = 'active';
  }
  if (attempt.status !== status) steps.push({ op: 'set-status', status: attempt.status });
  return steps;
}

/** The account's attempt for this guest attempt: the same id (an earlier, unfinished run) or the same interest. */
export function findAccountAttempt(
  guest: Pick<MergeAttempt, 'id' | 'interest_id'>,
  cloud: CloudSnapshot['attempts'],
) {
  return (
    cloud.find((a) => a.id === guest.id) ??
    (guest.interest_id ? cloud.find((a) => a.interest_id === guest.interest_id) : undefined)
  );
}

/** Guest days the account attempt doesn't have yet (it wins on days both have). */
export function missingDays(
  guestCheckins: readonly MergeCheckin[],
  accountDays: readonly string[],
): MergeCheckin[] {
  const taken = new Set(accountDays);
  const added: MergeCheckin[] = [];
  for (const checkin of [...guestCheckins].sort(byDateThenCreated)) {
    if (taken.has(checkin.local_date)) continue;
    taken.add(checkin.local_date);
    added.push(checkin);
  }
  return added;
}

/**
 * One plan per guest attempt, in the order the guest created them. Notes and photos follow their
 * attempt to its target; photos get their account Storage path (`<user>/<attempt>/<id>.jpg`,
 * keeping the guest id so a retried upload lands on the same file).
 */
export function planGuestMerge<A extends MergeAttempt>(
  guest: GuestSnapshot<A>,
  cloud: CloudSnapshot,
  userId: string,
): AttemptMergePlan<A>[] {
  return guest.attempts.map((attempt) => {
    const checkins = guest.checkins.filter((c) => c.attempt_id === attempt.id);
    const account = findAccountAttempt(attempt, cloud.attempts);
    const targetId = account?.id ?? attempt.id;

    let steps: AttemptStep[];
    if (account) {
      const days = cloud.checkins.filter((c) => c.attempt_id === account.id).map((c) => c.local_date);
      const added = missingDays(checkins, days);
      steps = added.length ? [{ op: 'insert-checkins', checkins: added.map(toInsert) }] : [];
    } else {
      steps = createSteps(attempt, checkins);
    }

    return {
      guest: attempt,
      kind: account ? 'join' : 'create',
      targetId,
      steps,
      notes: guest.notes.filter((n) => n.attempt_id === attempt.id).map((n) => ({ id: n.id, content: n.content })),
      photos: guest.photos
        .filter((p) => p.attempt_id === attempt.id)
        .map((p) => ({
          id: p.id,
          localPath: p.storage_path,
          cloudPath: buildMediaPath(userId, targetId, p.id, 'image/jpeg'),
          file_size: p.file_size,
        })),
    };
  });
}

/** A unique-key clash (Postgres 23505) or an existing Storage object: already uploaded, so fine on retry. */
export function isAlreadyThere(error: unknown): boolean {
  if (typeof error !== 'object' || !error) return false;
  const e = error as { code?: unknown; statusCode?: unknown; status?: unknown; message?: unknown };
  if (String(e.code) === '23505') return true;
  if (String(e.statusCode) === '409' || String(e.status) === '409') return true;
  return /already exists|duplicate/i.test(String(e.message ?? ''));
}
