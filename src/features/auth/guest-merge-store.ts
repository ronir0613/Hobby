import { create } from 'zustand';

import { loadHobbies, resetHobbies } from '@/features/hobbies/hobbies-store';
import { loadKeepsakes, resetKeepsakes } from '@/features/keepsakes/keepsakes-store';
import { loadQuiz, resetQuiz } from '@/features/quiz/quiz-store';
import { loadReminders, resetReminders } from '@/features/reminders/reminders-store';
import { clearGuestData } from '@/services/guest-store';
import { hasDataToMerge, mergeGuestData } from '@/services/guest-sync';
import { syncReminders } from '@/services/reminder-scheduler';

import { useAuthStore } from './auth-store';

type GuestMergeState = {
  /** 'merging' while the phone's guest data moves to the account; 'failed' leaves it on the phone to retry. */
  status: 'idle' | 'merging' | 'failed';
};

export const useGuestMergeStore = create<GuestMergeState>(() => ({ status: 'idle' }));

/** Shows the current space again from scratch (after a merge or clearing the phone). */
function reloadEverything() {
  resetHobbies();
  resetKeepsakes();
  resetReminders();
  resetQuiz();
  void loadHobbies();
  void loadKeepsakes();
  void loadReminders();
  void loadQuiz();
}

/** Uploads the guest's phone data to the signed-in account. Safe to call again after a failure. */
export async function runGuestMerge() {
  const userId = useAuthStore.getState().session?.user.id;
  if (!userId || useGuestMergeStore.getState().status === 'merging') return;
  if (!(await hasDataToMerge())) return;
  useGuestMergeStore.setState({ status: 'merging' });
  try {
    await mergeGuestData(userId);
    useGuestMergeStore.setState({ status: 'idle' });
  } catch (error) {
    if (__DEV__) console.warn('Moving guest data to the account failed', error);
    useGuestMergeStore.setState({ status: 'failed' });
  } finally {
    if (useAuthStore.getState().session?.user.id === userId) reloadEverything();
  }
}

/** Removes everything a guest kept on this phone (hobbies, days, notes, photos, reminders). */
export async function clearPhoneData() {
  await clearGuestData();
  await syncReminders(null);
  reloadEverything();
}

let started = false;

/** Call once at app start: merges on sign-in and, if an earlier merge stopped, on the next launch. */
export function startGuestMerge() {
  if (started) return () => {};
  started = true;
  let lastUserId: string | null = null;
  const stop = useAuthStore.subscribe((auth) => {
    const userId = auth.ready ? (auth.session?.user.id ?? null) : null;
    if (userId === lastUserId) return;
    lastUserId = userId;
    if (userId) void runGuestMerge();
    else useGuestMergeStore.setState({ status: 'idle' });
  });
  return () => {
    stop();
    started = false;
  };
}
