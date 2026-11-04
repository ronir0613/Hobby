import { create } from 'zustand';

import { useAuthStore } from '@/features/auth/auth-store';
import {
  createAttempt,
  getAttempt,
  listAttempts,
  setAttemptStatus,
  type Attempt,
  type AttemptStatus,
} from '@/services/attempts';
import {
  addCheckin,
  currentRun,
  listMyCheckins,
  setCheckinResult,
  statusAfterCheckins,
  type Checkin,
  type CheckinResult,
} from '@/services/checkins';

type HobbiesState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  attempts: Attempt[];
  checkins: Record<string, Checkin[]>; // by attempt id, newest first
};

const initial: HobbiesState = { status: 'idle', attempts: [], checkins: {} };

export const useHobbiesStore = create<HobbiesState>(() => initial);

function groupByAttempt(rows: Checkin[]) {
  const grouped: Record<string, Checkin[]> = {};
  for (const row of rows) (grouped[row.attempt_id] ??= []).push(row);
  return grouped;
}

let inFlight: Promise<void> | null = null;

/** Loads (or reloads) the user's attempts and check-ins. A failed reload keeps what was shown. */
export function loadHobbies() {
  if (inFlight) return inFlight;
  useHobbiesStore.setState((state) => ({ status: state.status === 'ready' ? 'ready' : 'loading' }));
  const userId = useAuthStore.getState().session?.user.id;
  inFlight = Promise.all([listAttempts(), listMyCheckins()])
    .then(([attempts, checkins]) => {
      if (useAuthStore.getState().session?.user.id !== userId) return; // signed out meanwhile
      useHobbiesStore.setState({ status: 'ready', attempts, checkins: groupByAttempt(checkins) });
    })
    .catch((error: unknown) => {
      if (__DEV__) console.warn('My hobbies failed to load', error);
      useHobbiesStore.setState((state) => ({ status: state.status === 'ready' ? 'ready' : 'error' }));
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

function putAttempt(attempt: Attempt) {
  useHobbiesStore.setState((state) => ({
    attempts: state.attempts.some((a) => a.id === attempt.id)
      ? state.attempts.map((a) => (a.id === attempt.id ? attempt : a))
      : [attempt, ...state.attempts],
  }));
}

function putCheckins(attemptId: string, update: (rows: Checkin[]) => Checkin[]) {
  useHobbiesStore.setState((state) => ({
    checkins: {
      ...state.checkins,
      [attemptId]: update(state.checkins[attemptId] ?? []).sort((a, b) => b.local_date.localeCompare(a.local_date)),
    },
  }));
}

/**
 * Re-reads the attempt (the database makes a planned attempt active on its first check-in), then
 * applies the app's rules: 7 tried days → completed, two skipped days in a row → dropped.
 */
async function syncStatus(attemptId: string) {
  let attempt = await getAttempt(attemptId);
  if (!attempt) return;
  const run = currentRun(useHobbiesStore.getState().checkins[attemptId] ?? [], attempt.started_at);
  const next = statusAfterCheckins(attempt.status, run) as AttemptStatus;
  if (next !== attempt.status) attempt = await setAttemptStatus(attemptId, next);
  putAttempt(attempt);
}

/** Today's answer. Only today can be answered; it can be switched until the day ends. */
export async function answerToday(attemptId: string, result: CheckinResult, today: string, existing?: Checkin) {
  if (existing) {
    const row = await setCheckinResult(existing.id, result);
    putCheckins(attemptId, (rows) => rows.map((r) => (r.id === row.id ? row : r)));
  } else {
    const row = await addCheckin({ attemptId, result, localDate: today });
    putCheckins(attemptId, (rows) => [...rows.filter((r) => r.id !== row.id), row]);
  }
  await syncStatus(attemptId);
}

/**
 * Adds a planned attempt for a catalogue interest. The database allows one per interest, so if
 * one already exists (another device, a double tap) we reload and hand back that one instead.
 */
export async function startAttempt(interestId: string, starterIdeaId: string | null): Promise<Attempt> {
  try {
    const attempt = await createAttempt({ interest_id: interestId, starter_idea_id: starterIdeaId });
    putAttempt(attempt);
    return attempt;
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
    if (code !== '23505') throw error;
    await loadHobbies();
    const existing = useHobbiesStore.getState().attempts.find((a) => a.interest_id === interestId);
    if (!existing) throw error;
    return existing;
  }
}

/** "Give it another go": back to planned. History is kept; the next check-in starts a new go. */
export async function giveAnotherGo(attemptId: string) {
  putAttempt(await setAttemptStatus(attemptId, 'planned'));
}

// Never show one account's hobbies to the next: clear everything when the user changes.
let lastUserId: string | null = null;
useAuthStore.subscribe((auth) => {
  const userId = auth.session?.user.id ?? null;
  if (userId === lastUserId) return;
  lastUserId = userId;
  useHobbiesStore.setState(initial);
});
