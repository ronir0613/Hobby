import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { onAuthChange } from '@/services/auth';

type AuthState = {
  session: Session | null;
  /** False until the stored session has been read on launch. */
  ready: boolean;
};

export const useAuthStore = create<AuthState>(() => ({ session: null, ready: false }));

let started = false;

/** Call once at app start. Mirrors Supabase's session (restored, signed in, refreshed, signed out). */
export function startAuthListener() {
  if (started) return () => {};
  started = true;
  const stop = onAuthChange((_event, session) => {
    useAuthStore.setState({ session, ready: true });
  });
  return () => {
    stop();
    started = false;
  };
}

/** How the user signed in, for display. */
export function signInMethodLabel(session: Session) {
  const provider = session.user.app_metadata?.provider;
  return provider === 'google' ? 'Google' : 'Email';
}
