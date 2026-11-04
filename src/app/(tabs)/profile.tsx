import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View, useColorScheme } from 'react-native';
import { ActionButton } from '@/components/ActionButton';
import { AppScreen } from '@/components/AppScreen';
import { AppText } from '@/components/AppText';
import { signInMethodLabel, useAuthStore } from '@/features/auth/auth-store';
import { deleteAccount, signOut } from '@/services/auth';
import { darkColors, lightColors } from '@/theme/colors';

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Please try again.';

export default function ProfileScreen() {
  const colors = useColorScheme() === 'dark' ? darkColors : lightColors;
  const session = useAuthStore((state) => state.session);
  const ready = useAuthStore((state) => state.ready);
  const [busy, setBusy] = useState<'sign-out' | 'delete' | null>(null);

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
        ) : session ? (
          <>
            <View className="mt-8 rounded-card border border-border bg-surface p-6 dark:border-dark-border dark:bg-dark-surface">
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

            <View className="mt-10 border-t border-border pt-6 dark:border-dark-border">
              <AppText weight="semibold" size={16}>
                Delete account
              </AppText>
              <AppText tone="secondary" size={14} style={{ marginTop: 4 }}>
                Permanently removes your account and everything saved to it.
              </AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete account"
                accessibilityHint="Asks you to confirm first"
                accessibilityState={{ disabled: busy !== null }}
                disabled={busy !== null}
                onPress={confirmDelete}
                className="mt-2 min-h-12 flex-row items-center self-start gap-2"
                style={({ pressed }) => ({ opacity: busy !== null ? 0.6 : pressed ? 0.7 : 1 })}
              >
                {busy === 'delete' ? <ActivityIndicator size="small" color={colors.foreground} /> : null}
                <AppText weight="semibold" size={15} style={{ textDecorationLine: 'underline' }}>
                  {busy === 'delete' ? 'Deleting…' : 'Delete my account'}
                </AppText>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <View className="mt-8 rounded-card border border-border bg-surface p-6 dark:border-dark-border dark:bg-dark-surface">
              <AppText weight="semibold" size={21}>
                Start wherever you are.
              </AppText>
              <AppText tone="secondary" size={15} style={{ marginTop: 8 }}>
                You can browse interests without an account. Sign in to keep your attempts, notes and reminders.
              </AppText>
            </View>

            <ActionButton label="Sign in" href="/sign-in" style={{ marginTop: 22 }} />
            <ActionButton label="Browse interests" href="/explore" variant="secondary" style={{ marginTop: 12 }} />
          </>
        )}
      </View>
    </AppScreen>
  );
}
