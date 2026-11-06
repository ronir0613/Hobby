import { useState } from 'react';
import { ActivityIndicator, Alert, View, useColorScheme } from 'react-native';
import { ActionButton } from '@/components/ActionButton';
import { AppScreen } from '@/components/AppScreen';
import { AppText } from '@/components/AppText';
import { ListGroup, SectionTitle } from '@/components/ListGroup';
import { PressableScale } from '@/components/PressableScale';
import { ErrorMessage, LoadingMessage } from '@/components/StatusMessage';
import { signInMethodLabel, useAuthStore } from '@/features/auth/auth-store';
import { clearPhoneData, runGuestMerge, useGuestMergeStore } from '@/features/auth/guest-merge-store';
import { MyHobbiesSection } from '@/features/hobbies/MyHobbiesSection';
import { photosLeftCopy } from '@/features/keepsakes/keepsakes-copy';
import { QuizRow } from '@/features/quiz/QuizRow';
import { RemindersRow } from '@/features/reminders/RemindersRow';
import { deleteAccount, signOut } from '@/services/auth';
import { darkColors, lightColors, space } from '@/theme/colors';

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Please try again.';

/** A quiet, underlined action with one line of context (there is no danger colour yet). */
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
    <View style={{ marginTop: space['8'] }}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={props.title}
        accessibilityHint="Asks you to confirm first"
        accessibilityState={{ disabled: props.disabled }}
        disabled={props.disabled}
        onPress={props.onPress}
        className="min-h-12 flex-row items-center self-start gap-2"
      >
        {props.busy ? <ActivityIndicator size="small" color={colors.foreground} /> : null}
        <AppText weight="semibold" style={{ textDecorationLine: 'underline' }}>
          {props.label}
        </AppText>
      </PressableScale>
      <AppText variant="small" tone="secondary">
        {props.body}
      </AppText>
    </View>
  );
}

export default function ProfileScreen() {
  const colors = useColorScheme() === 'dark' ? darkColors : lightColors;
  const session = useAuthStore((state) => state.session);
  const ready = useAuthStore((state) => state.ready);
  const mergeStatus = useGuestMergeStore((state) => state.status);
  const photosLeft = useGuestMergeStore((state) => state.photosLeft);
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
      <View style={{ paddingTop: space['8'], paddingBottom: space['8'] }}>
        <AppText accessibilityRole="header" variant="display" style={{ marginBottom: space['8'] }}>
          Profile
        </AppText>

        {!ready ? (
          <View className="items-center py-8">
            <ActivityIndicator color={colors.accentText} accessibilityLabel="Loading your account" />
          </View>
        ) : (
          <>
            {session && mergeStatus === 'merging' ? (
              <LoadingMessage label="Moving what you saved on this phone to your account…" />
            ) : session && mergeStatus === 'failed' ? (
              <View style={{ marginBottom: space['6'] }}>
                <ErrorMessage
                  title="Some of what you saved on this phone isn’t on your account yet."
                  body="It’s still safe on the phone. Check your connection, then try again."
                  onAction={() => void runGuestMerge()}
                />
              </View>
            ) : session && photosLeft > 0 ? (
              <View style={{ marginBottom: space['6'] }}>
                <ErrorMessage {...photosLeftCopy(photosLeft)} onAction={() => void runGuestMerge()} />
              </View>
            ) : null}

            <MyHobbiesSection />

            <SectionTitle>Preferences</SectionTitle>
            <ListGroup>
              <RemindersRow />
              <QuizRow />
            </ListGroup>

            {session ? (
              <>
                <SectionTitle>Account</SectionTitle>
                <View
                  className="rounded-card border border-border bg-surface dark:border-dark-border dark:bg-dark-surface"
                  style={{ padding: space.card }}
                >
                  <AppText weight="semibold" selectable>
                    {session.user.email ?? 'Your account'}
                  </AppText>
                  <AppText variant="small" tone="secondary" style={{ marginTop: space['1'] }}>
                    {`Signed in with ${signInMethodLabel(session)}. Your hobbies, notes and reminders are saved here.`}
                  </AppText>
                  <ActionButton
                    label={busy === 'sign-out' ? 'Signing out…' : 'Sign out'}
                    variant="secondary"
                    onPress={handleSignOut}
                    disabled={busy !== null}
                    style={{ marginTop: space['4'] }}
                  />
                </View>

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
                <SectionTitle>Back up your hobbies</SectionTitle>
                <View
                  className="rounded-card border border-border bg-surface dark:border-dark-border dark:bg-dark-surface"
                  style={{ padding: space.card }}
                >
                  <AppText tone="secondary">
                    Saved on this phone only. Sign in to keep them safe.
                  </AppText>
                  <ActionButton label="Sign in" href="/sign-in" style={{ marginTop: space['4'] }} />
                </View>

                <QuietDanger
                  title="Clear this phone"
                  body="Removes the hobbies, notes, photos and reminders saved here."
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
