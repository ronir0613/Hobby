import { create } from 'zustand';

import { currentData, spaceKey, useAuthStore } from '@/features/auth/auth-store';
import type { Attempt, AttemptStatus } from '@/services/attempts';
import { currentRun, statusAfterCheckins, type CheckinResult } from '@/services/checkin-rules';
import type { Checkin } from '@/services/checkins';

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
let inFlightSpace: string | null = null;

/** Loads (or reloads) attempts and check-ins from the account or this phone. A failed reload keeps what was shown. */
export function loadHobbies() {
  const space = spaceKey(useAuthStore.getState());
  if (inFlight && inFlightSpace === space) return inFlight; // a load from another space is discarded
  inFlightSpace = space;
  useHobbiesStore.setState((state) => ({ status: state.status === 'ready' ? 'ready' : 'loading' }));
  const data = currentData();
  inFlight = Promise.all([data.listAttempts(), data.listMyCheckins()])
    .then(([attempts, checkins]) => {
      if (spaceKey(useAuthStore.getState()) !== space) return; // signed in or out meanwhile
      useHobbiesStore.setState({ status: 'ready', attempts, checkins: groupByAttempt(checkins) });
    })
    .catch((error: unknown) => {
      if (spaceKey(useAuthStore.getState()) !== space) return;
      if (__DEV__) console.warn('My hobbies failed to load', error);
      useHobbiesStore.setState((state) => ({ status: state.status === 'ready' ? 'ready' : 'error' }));
    })
    .finally(() => {
      if (inFlightSpace === space) inFlight = null;
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
 * Re-reads the attempt (a planned attempt becomes active on its first check-in, in the database or
 * the guest store), then applies the shared rules: 7 tried days → completed, two skipped days in a
 * row → dropped.
 */
async function syncStatus(attemptId: string) {
  const data = currentData();
  let attempt = await data.getAttempt(attemptId);
  if (!attempt) return;
  const run = currentRun(useHobbiesStore.getState().checkins[attemptId] ?? [], attempt.started_at);
  const next = statusAfterCheckins(attempt.status, run) as AttemptStatus;
  if (next !== attempt.status) attempt = await data.setAttemptStatus(attemptId, next);
  putAttempt(attempt);
}

/** Today's answer. Only today can be answered; it can be switched until the day ends. */
export async function answerToday(attemptId: string, result: CheckinResult, today: string, existing?: Checkin) {
  const data = currentData();
  if (existing) {
    const row = await data.setCheckinResult(existing.id, result);
    putCheckins(attemptId, (rows) => rows.map((r) => (r.id === row.id ? row : r)));
  } else {
    const row = await data.addCheckin({ attemptId, result, localDate: today });
    putCheckins(attemptId, (rows) => [...rows.filter((r) => r.id !== row.id), row]);
  }
  await syncStatus(attemptId);
}

/**
 * Adds a planned attempt for a catalogue interest. There is one per interest, so if one already
 * exists (another device, a double tap) we reload and hand back that one instead.
 */
export async function startAttempt(interestId: string, starterIdeaId: string | null): Promise<Attempt> {
  try {
    const attempt = await currentData().createAttempt({ interest_id: interestId, starter_idea_id: starterIdeaId });
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
  putAttempt(await currentData().setAttemptStatus(attemptId, 'planned'));
}

/** Forgets what is shown, so the next load reads the current space again. */
export function resetHobbies() {
  useHobbiesStore.setState(initial);
}

// Never show one space's hobbies in the next (account to account, account to guest and back).
let lastSpace = spaceKey(useAuthStore.getState());
useAuthStore.subscribe((auth) => {
  const space = spaceKey(auth);
  if (space === lastSpace) return;
  lastSpace = space;
  resetHobbies();
});
