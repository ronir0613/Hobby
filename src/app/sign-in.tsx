import { isAuthError } from '@supabase/supabase-js';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Pressable, View, useColorScheme, type TextInput } from 'react-native';
import { ActionButton } from '@/components/ActionButton';
import { AppScreen } from '@/components/AppScreen';
import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { TextField } from '@/components/TextField';
import { useAuthStore } from '@/features/auth/auth-store';
import { signInWithEmail, signInWithGoogle, signUpWithEmail } from '@/services/auth';
import { darkColors, lightColors } from '@/theme/colors';

type Mode = 'sign-in' | 'create';
type Busy = 'email' | 'google' | null;

const MIN_PASSWORD = 6; // Supabase Auth default

function friendlyError(error: unknown) {
  if (isAuthError(error)) {
    switch (error.code) {
      case 'invalid_credentials':
        return "That email and password don't match. Try again, or create an account.";
      case 'email_not_confirmed':
        return 'Please confirm your email first. The link is in your inbox.';
      case 'user_already_exists':
        return 'There is already an account with this email. Try signing in instead.';
      case 'weak_password':
        return `Choose a password with at least ${MIN_PASSWORD} characters.`;
      case 'over_email_send_rate_limit':
      case 'over_request_rate_limit':
        return 'Too many tries for now. Please wait a minute and try again.';
    }
  }
  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code === 'string' && code.startsWith('ERR_GOOGLE_ID') && code.includes('NO_CREDENTIAL')) {
    return 'No Google account was found on this phone. Add one in Settings, or use email.';
  }
  if (error instanceof Error && /network|fetch/i.test(error.message)) {
    return "Couldn't reach the server. Check your connection and try again.";
  }
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

export default function SignInScreen() {
  const colors = useColorScheme() === 'dark' ? darkColors : lightColors;
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);
  const creating = mode === 'create';

  // Leaving without signing in drops the pending return, so a later sign-in from Profile stays put.
  // A sign-in in progress keeps it: the protected route may leave this screen as the session lands.
  const signingIn = useRef(false);
  useEffect(
    () => () => {
      if (!signingIn.current && !useAuthStore.getState().session) useAuthStore.setState({ returnTo: null });
    },
    [],
  );

  // On success the auth listener updates the session and the protected
  // route sends the user back to the tabs, so nothing else to do here.
  async function continueWithGoogle() {
    setError(null);
    setNotice(null);
    setBusy('google');
    signingIn.current = true;
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      signingIn.current = false;
      setBusy(null);
    }
  }

  async function submitEmail() {
    setError(null);
    setNotice(null);
    const trimmed = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
      setError('Enter the email address you use for Hobby.');
      return;
    }
    if (password.length < MIN_PASSWORD) {
      setError(`Your password needs at least ${MIN_PASSWORD} characters.`);
      return;
    }
    setBusy('email');
    signingIn.current = true;
    try {
      if (creating) {
        const { needsConfirmation } = await signUpWithEmail(trimmed, password);
        if (needsConfirmation) {
          setNotice(`We sent a link to ${trimmed}. Open it on this phone to finish creating your account.`);
        }
      } else {
        await signInWithEmail(trimmed, password);
      }
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      signingIn.current = false;
      setBusy(null);
    }
  }

  function switchMode() {
    setMode(creating ? 'sign-in' : 'create');
    setError(null);
    setNotice(null);
  }

  return (
    <AppScreen>
      <View className="pb-8 pt-3">
        <BackButton fallback="/profile" />

        <AppText accessibilityRole="header" variant="display" style={{ marginTop: 8 }}>
          {creating ? 'Create an account' : 'Sign in'}
        </AppText>
        <AppText tone="secondary" style={{ marginTop: 8 }}>
          Keep your hobbies, notes and reminders safe, and use them on a new phone.
        </AppText>

        <ActionButton
          label={busy === 'google' ? 'Opening Google…' : 'Continue with Google'}
          variant="secondary"
          onPress={continueWithGoogle}
          disabled={busy !== null}
          style={{ marginTop: 24 }}
        />

        <View className="my-6 flex-row items-center gap-3" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View className="h-px flex-1 bg-border dark:bg-dark-border" />
          <AppText tone="secondary" variant="small">
            or
          </AppText>
          <View className="h-px flex-1 bg-border dark:bg-dark-border" />
        </View>

        <View className="gap-4">
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            submitBehavior="submit"
          />
          <TextField
            ref={passwordRef}
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder={creating ? `At least ${MIN_PASSWORD} characters` : 'Your password'}
            secureTextEntry
            autoCapitalize="none"
            autoComplete={creating ? 'new-password' : 'current-password'}
            textContentType={creating ? 'newPassword' : 'password'}
            returnKeyType="go"
            onSubmitEditing={submitEmail}
          />
        </View>

        {error ? (
          <View accessibilityLiveRegion="polite" className="mt-4 rounded-tile border border-input-border bg-muted p-4 dark:border-dark-input-border dark:bg-dark-muted">
            <AppText accessibilityRole="alert" variant="small" weight="medium">
              {error}
            </AppText>
          </View>
        ) : null}
        {notice ? (
          <View accessibilityLiveRegion="polite" className="mt-4 rounded-tile bg-secondary p-4 dark:bg-dark-secondary">
            <AppText variant="small">{notice}</AppText>
          </View>
        ) : null}

        <ActionButton
          label={busy === 'email' ? (creating ? 'Creating account…' : 'Signing in…') : creating ? 'Create account' : 'Sign in'}
          onPress={submitEmail}
          disabled={busy !== null}
          style={{ marginTop: 16 }}
        />

        <Pressable
          accessibilityRole="button"
          onPress={switchMode}
          disabled={busy !== null}
          className="mt-3 min-h-12 items-center justify-center"
        >
          <AppText tone="secondary" variant="small">
            {creating ? 'Already have an account? ' : 'New here? '}
            <AppText variant="small" weight="semibold" style={{ color: colors.accentText }}>
              {creating ? 'Sign in' : 'Create an account'}
            </AppText>
          </AppText>
        </Pressable>
      </View>
    </AppScreen>
  );
}
