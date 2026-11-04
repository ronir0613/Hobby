import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '@/lib/supabase/client';

// Every auth email link and the Google redirect come back here.
// Add this URL (and the Expo Go one in development) to Supabase Auth → URL Configuration.
export const AUTH_CALLBACK_PATH = 'auth/callback';
export const authRedirectUrl = () => Linking.createURL(AUTH_CALLBACK_PATH);

export function isAuthCallbackUrl(url: string) {
  return url.includes(AUTH_CALLBACK_PATH);
}

/** Reads `code` / `error_description` from the query string or the hash. */
function readCallbackParams(url: string) {
  const parsed = new URL(url);
  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ''));
  const get = (key: string) => parsed.searchParams.get(key) ?? hash.get(key);
  return { code: get('code'), error: get('error_description') ?? get('error') };
}

// A redirect can reach the app twice on Android (browser result + deep link).
// A PKCE code works only once, so share one exchange per code.
const exchanges = new Map<string, Promise<Session>>();

/** Turns an auth callback URL (OAuth, email confirmation, password reset) into a session. */
export function completeAuthFromUrl(url: string): Promise<Session> {
  const { code, error } = readCallbackParams(url);
  if (error) return Promise.reject(new Error(error));
  if (!code) return Promise.reject(new Error('The sign-in link is missing its code.'));

  let exchange = exchanges.get(code);
  if (!exchange) {
    exchange = supabase.auth.exchangeCodeForSession(code).then(({ data, error: exchangeError }) => {
      if (exchangeError) throw exchangeError;
      return data.session;
    });
    exchanges.set(code, exchange);
  }
  return exchange;
}

export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: authRedirectUrl() },
  });
  if (error) throw error;
  // session is null until the user confirms their email (when confirmation is on).
  return { user: data.user, session: data.session, needsConfirmation: !data.session };
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

/** Sends a reset link. Opening it signs the user in and fires `PASSWORD_RECOVERY`. */
export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: authRedirectUrl(),
  });
  if (error) throw error;
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

/** Opens Google in a browser tab. Resolves to null if the user closes it. */
export async function signInWithGoogle(): Promise<Session | null> {
  const redirectTo = authRedirectUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return null;
  return completeAuthFromUrl(result.url);
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

/** Subscribe to sign-in/out. Returns an unsubscribe function. */
export function onAuthChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
  const { data } = supabase.auth.onAuthStateChange(callback);
  return () => data.subscription.unsubscribe();
}
