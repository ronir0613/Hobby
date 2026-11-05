import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { currentData, spaceKey, useAuthStore } from '@/features/auth/auth-store';

import type { QuizAnswers } from './quiz-model';

// The starting quiz's answers for the current space (the account's profile, or this phone for a
// guest), and whether this phone has already shown the quiz once. "Seen" belongs to the phone, not
// the space, so signing out doesn't bring the quiz back.

const SEEN_KEY = 'hobby.quiz.seen.v1';

type QuizState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  answers: QuizAnswers | null;
  /** Null until read from the phone. */
  seen: boolean | null;
};

export const useQuizStore = create<QuizState>(() => ({ status: 'idle', answers: null, seen: null }));

let inFlight: Promise<void> | null = null;
let inFlightSpace: string | null = null;

async function readSeen() {
  try {
    return (await AsyncStorage.getItem(SEEN_KEY)) === '1';
  } catch {
    return true; // never trap anyone in the quiz because storage failed
  }
}

/** Loads (or reloads) the answers for the current space. A failed reload keeps what was shown. */
export function loadQuiz() {
  const space = spaceKey(useAuthStore.getState());
  if (inFlight && inFlightSpace === space) return inFlight;
  inFlightSpace = space;
  useQuizStore.setState((s) => ({ status: s.status === 'ready' ? 'ready' : 'loading' }));
  inFlight = Promise.all([currentData().getQuizAnswers(), readSeen()])
    .then(([answers, seen]) => {
      if (spaceKey(useAuthStore.getState()) !== space) return;
      useQuizStore.setState({ status: 'ready', answers, seen });
    })
    .catch(async (error: unknown) => {
      if (spaceKey(useAuthStore.getState()) !== space) return;
      if (__DEV__) console.warn('Quiz answers failed to load', error);
      const seen = await readSeen();
      useQuizStore.setState((s) => ({ status: s.status === 'ready' ? 'ready' : 'error', seen }));
    })
    .finally(() => {
      if (inFlightSpace === space) inFlight = null;
    });
  return inFlight;
}

/** Remembers that the quiz was shown on this phone (taken, skipped or closed). */
export function markQuizSeen() {
  useQuizStore.setState({ seen: true });
  AsyncStorage.setItem(SEEN_KEY, '1').catch(() => undefined);
}

/** Saves the answers to the current space. Throws if saving fails; nothing changes then. */
export async function saveQuiz(answers: QuizAnswers) {
  const space = spaceKey(useAuthStore.getState());
  const saved = await currentData().saveQuizAnswers(answers);
  if (spaceKey(useAuthStore.getState()) !== space) return;
  useQuizStore.setState({ status: 'ready', answers: saved });
}

/** Forgets the shown answers (signing in or out); the next screen that needs them loads the new space's. */
export function resetQuiz() {
  useQuizStore.setState((s) => ({ status: 'idle', answers: null, seen: s.seen }));
}

// Never rank one space's Discover with another's answers.
let lastSpace = spaceKey(useAuthStore.getState());
useAuthStore.subscribe((auth) => {
  const space = spaceKey(auth);
  if (space === lastSpace) return;
  lastSpace = space;
  resetQuiz();
});
