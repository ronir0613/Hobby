import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View, useColorScheme } from 'react-native';
import { ActionButton } from '@/components/ActionButton';
import { AppScreen } from '@/components/AppScreen';
import { AppText } from '@/components/AppText';
import { ErrorMessage, LoadingMessage } from '@/components/StatusMessage';
import { signInMethodLabel, useAuthStore } from '@/features/auth/auth-store';
import { clearPhoneData, runGuestMerge, useGuestMergeStore } from '@/features/auth/guest-merge-store';
import { MyHobbiesSection } from '@/features/hobbies/MyHobbiesSection';
import { QuizRow } from '@/features/quiz/QuizRow';
import { RemindersRow } from '@/features/reminders/RemindersRow';
import { deleteAccount, signOut } from '@/services/auth';
import { darkColors, lightColors } from '@/theme/colors';

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Please try again.';

/** A quiet, underlined action under a divider (there is no danger colour yet). */
function QuietDanger(props: {
  title: string;
  body: string;
  label: string;
  busy: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const colors = useColorScheme() === 'dark' ? darkColors : lightColors;
  return (
    <View className="mt-10 border-t border-border pt-6 dark:border-dark-border">
      <AppText weight="semibold" size={16}>
        {props.title}
      </AppText>
      <AppText tone="secondary" size={14} style={{ marginTop: 4 }}>
        {props.body}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={props.title}
        accessibilityHint="Asks you to confirm first"
        accessibilityState={{ disabled: props.disabled }}
        disabled={props.disabled}
        onPress={props.onPress}
        className="mt-2 min-h-12 flex-row items-center self-start gap-2"
        style={({ pressed }) => ({ opacity: props.disabled ? 0.6 : pressed ? 0.7 : 1 })}
      >
        {props.busy ? <ActivityIndicator size="small" color={colors.foreground} /> : null}
        <AppText weight="semibold" size={15} style={{ textDecorationLine: 'underline' }}>
          {props.label}
        </AppText>
      </Pressable>
    </View>
  );
}

export default function ProfileScreen() {
  const colors = useColorScheme() === 'dark' ? darkColors : lightColors;
  const session = useAuthStore((state) => state.session);
  const ready = useAuthStore((state) => state.ready);
  const mergeStatus = useGuestMergeStore((state) => state.status);
  const [busy, setBusy] = useState<'sign-out' | 'delete' | 'clear' | null>(null);

  async function handleSignOut() {
    setBusy('sign-out');
    try {
      await signOut();
    } catch (error) {
      Alert.alert("Couldn't sign out", errorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function runDelete() {
    setBusy('delete');
    try {
      await deleteAccount();
      Alert.alert('Account deleted', 'Your account, notes and photos have been removed.');
    } catch (error) {
      Alert.alert("Couldn't delete your account", `${errorMessage(error)}\n\nNothing was removed. Please try again.`);
    } finally {
      setBusy(null);
    }
  }

  function confirmDelete() {
    Alert.alert(
      'Delete your account?',
      'This permanently removes your account, attempts, check-ins, notes and photos. It cannot be undone.',
      [
        { text: 'Keep my account', style: 'cancel' },
        { text: 'Delete account', style: 'destructive', onPress: runDelete },
      ],
    );
  }

  async function runClear() {
    setBusy('clear');
    try {
      await clearPhoneData();
    } catch (error) {
      Alert.alert("Couldn't clear this phone", errorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  function confirmClear() {
    Alert.alert(
      'Clear this phone?',
      'This removes your hobbies, check-ins, notes, photos and reminders from this phone. It cannot be undone.',
      [
        { text: 'Keep them', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: runClear },
      ],
    );
  }

  return (
    <AppScreen>
      <View className="pb-8 pt-7">
        <AppText tone="secondary" weight="semibold" size={12} style={{ letterSpacing: 1.5 }}>
          YOUR SPACE
        </AppText>
        <AppText accessibilityRole="header" weight="medium" size={35} style={{ lineHeight: 41, marginTop: 13, letterSpacing: -0.8 }}>
          Make it your own, one interest at a time.
        </AppText>
        <AppText tone="secondary" size={16} style={{ marginTop: 10 }}>
          This space will grow with you, without turning curiosity into a checklist.
        </AppText>

        {!ready ? (
          <View className="mt-8 items-center py-8">
            <ActivityIndicator color={colors.accentText} accessibilityLabel="Loading your account" />
          </View>
        ) : (
          <>
            {session && mergeStatus === 'merging' ? (
              <LoadingMessage label="Moving what you saved on this phone to your account…" />
            ) : session && mergeStatus === 'failed' ? (
              <View className="mt-6">
                <ErrorMessage
                  title="Some of what you saved on this phone isn’t on your account yet."
                  body="It’s still safe on the phone. Check your connection, then try again."
                  onAction={() => void runGuestMerge()}
                />
              </View>
            ) : null}

            <MyHobbiesSection />
            <RemindersRow />
            <QuizRow />

            {session ? (
              <>
                <View className="mt-10 rounded-card border border-border bg-surface p-6 dark:border-dark-border dark:bg-dark-surface">
                  <AppText tone="secondary" weight="semibold" size={12} style={{ letterSpacing: 1.1 }}>
                    SIGNED IN WITH {signInMethodLabel(session).toUpperCase()}
                  </AppText>
                  <AppText weight="semibold" size={19} style={{ marginTop: 7 }} selectable>
                    {session.user.email ?? 'Your account'}
                  </AppText>
                  <AppText tone="secondary" size={15} style={{ marginTop: 8 }}>
                    Your attempts, notes and reminders are saved to this account.
                  </AppText>
                </View>

                <ActionButton
                  label={busy === 'sign-out' ? 'Signing out…' : 'Sign out'}
                  variant="secondary"
                  onPress={handleSignOut}
                  disabled={busy !== null}
                  style={{ marginTop: 22 }}
                />

                <QuietDanger
                  title="Delete account"
                  body="Permanently removes your account and everything saved to it."
                  label={busy === 'delete' ? 'Deleting…' : 'Delete my account'}
                  busy={busy === 'delete'}
                  disabled={busy !== null}
                  onPress={confirmDelete}
                />
              </>
            ) : (
              <>
                <View className="mt-10 rounded-card border border-border bg-surface p-6 dark:border-dark-border dark:bg-dark-surface">
                  <AppText accessibilityRole="header" weight="semibold" size={21}>
                    Back up and sync
                  </AppText>
                  <AppText tone="secondary" size={15} style={{ marginTop: 8 }}>
                    Your hobbies, notes, photos and reminders are saved on this phone. Sign in to keep them safe
                    with an account and bring them to a new phone.
                  </AppText>
                  <ActionButton label="Sign in" href="/sign-in" style={{ marginTop: 18 }} />
                </View>

                <QuietDanger
                  title="Clear this phone"
                  body="Removes the hobbies, notes, photos and reminders saved on this phone."
                  label={busy === 'clear' ? 'Clearing…' : 'Clear this phone’s data'}
                  busy={busy === 'clear'}
                  disabled={busy !== null}
                  onPress={confirmClear}
                />
              </>
            )}
          </>
        )}
      </View>
    </AppScreen>
  );
}
