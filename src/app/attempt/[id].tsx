import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { ActionButton } from '@/components/ActionButton';
import { AppScreen } from '@/components/AppScreen';
import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { SegmentedChoice } from '@/components/SegmentedChoice';
import { ErrorMessage, LoadingMessage } from '@/components/StatusMessage';
import { StatusList } from '@/components/StatusList';
import { StatusPill } from '@/components/StatusPill';
import { useAuthStore } from '@/features/auth/auth-store';
import { ensureCatalogue } from '@/features/explore/catalogue-store';
import { answerToday, giveAnotherGo, loadHobbies, useHobbiesStore } from '@/features/hobbies/hobbies-store';
import { useAttemptTitle } from '@/features/hobbies/use-attempt-title';
import { KeepsakesSection } from '@/features/keepsakes/KeepsakesSection';
import {
  TRIED_DAYS_TO_COMPLETE,
  currentRun,
  dayLabel,
  toLocalDate,
  type Checkin,
  type CheckinResult,
} from '@/services/checkins';

const NO_CHECKINS: Checkin[] = [];

const TODAY_OPTIONS = [
  { value: 'tried', label: 'Tried' },
  { value: 'skipped', label: 'Skipped' },
] as const;

function friendlyError(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  const message = typeof error === 'object' && error && 'message' in error ? String(error.message) : '';
  if (code === '23505') return 'Today already had an answer. We refreshed it, so have another look.';
  if (/network|fetch/i.test(message)) return "Couldn't reach the server. Check your connection and try again.";
  return "That didn't save just now. Please try again.";
}

export default function AttemptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const signedIn = useAuthStore((state) => state.session !== null);
  const authReady = useAuthStore((state) => state.ready);
  const loadStatus = useHobbiesStore((state) => state.status);
  const attempt = useHobbiesStore((state) => state.attempts.find((a) => a.id === id));
  const checkins = useHobbiesStore((state) => state.checkins[id] ?? NO_CHECKINS);
  const title = useAttemptTitle(attempt);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Opened directly (deep link, after sign-in) before Profile loaded the list.
  useEffect(() => {
    ensureCatalogue();
    if (authReady && useHobbiesStore.getState().status === 'idle') void loadHobbies();
  }, [authReady, signedIn]);

  async function run(action: () => Promise<unknown>) {
    setError(null);
    setBusy(true);
    try {
      await action();
    } catch (e) {
      if (__DEV__) console.warn('Saving a hobby change failed', e);
      setError(friendlyError(e));
      void loadHobbies(); // show what is saved
    } finally {
      setBusy(false);
    }
  }

  let body;
  if (!authReady) {
    body = <LoadingMessage label="Opening this hobby…" />;
  } else if (!attempt && loadStatus === 'error') {
    body = (
      <ErrorMessage
        title="We couldn't load this hobby."
        body="Check your connection, then try again."
        onAction={() => void loadHobbies()}
      />
    );
  } else if (!attempt && loadStatus !== 'ready') {
    body = <LoadingMessage label="Opening this hobby…" />;
  } else if (!attempt) {
    body = (
      <ErrorMessage
        title="We couldn't find this hobby."
        body="It may have been removed. Your other hobbies are on Profile."
        actionLabel="Go to Profile"
        onAction={() => router.replace('/profile')}
      />
    );
  } else {
    const today = toLocalDate();
    const open = attempt.status === 'planned' || attempt.status === 'active';
    const todayCheckin = checkins.find((c) => c.local_date === today);
    // A check-in from an earlier go can't count towards this one, and there is one per day.
    const todayIsFromLastGo =
      !!todayCheckin && !currentRun(checkins, attempt.started_at).some((c) => c.id === todayCheckin.id);
    const showToday = open && !todayIsFromLastGo;
    const history = checkins.filter((c) => !(showToday && c.id === todayCheckin?.id));

    body = (
      <>
        <AppText tone="secondary" weight="semibold" size={12} style={{ letterSpacing: 1.5 }}>
          MY HOBBY
        </AppText>
        <AppText accessibilityRole="header" weight="medium" size={34} style={{ lineHeight: 40, marginTop: 13, letterSpacing: -0.7 }}>
          {title}
        </AppText>
        <View className="mt-4">
          <StatusPill status={attempt.status} />
        </View>

        {attempt.status === 'dropped' ? (
          <View accessibilityLiveRegion="polite" className="mt-7 rounded-card bg-secondary p-5 dark:bg-dark-secondary">
            <AppText weight="semibold" size={18}>
              Maybe it wasn’t your thing. That’s okay.
            </AppText>
            <AppText size={15} style={{ marginTop: 6 }}>
              You skipped two days in a row, so we set it aside. Give it another go whenever you like, or find
              something new.
            </AppText>
            <ActionButton
              label={busy ? 'Starting…' : 'Give it another go'}
              onPress={() => void run(() => giveAnotherGo(attempt.id))}
              disabled={busy}
              style={{ marginTop: 16 }}
            />
            <ActionButton label="Find something new" href="/explore" variant="secondary" style={{ marginTop: 10 }} />
          </View>
        ) : attempt.status === 'completed' ? (
          <View accessibilityLiveRegion="polite" className="mt-7 rounded-card bg-secondary p-5 dark:bg-dark-secondary">
            <AppText weight="semibold" size={18}>
              You gave this a real go.
            </AppText>
            <AppText size={15} style={{ marginTop: 6 }}>
              {`You tried it on ${TRIED_DAYS_TO_COMPLETE} days. It stays here, and you can start a new go any time.`}
            </AppText>
            <ActionButton
              label={busy ? 'Starting…' : 'Give it another go'}
              variant="secondary"
              onPress={() => void run(() => giveAnotherGo(attempt.id))}
              disabled={busy}
              style={{ marginTop: 16 }}
            />
          </View>
        ) : null}

        {open ? (
          <>
            <AppText accessibilityRole="header" weight="semibold" size={18} style={{ marginTop: 28 }}>
              How did today go?
            </AppText>
            {showToday ? (
              <>
                <View className="mt-3">
                  <SegmentedChoice
                    label="Today"
                    options={TODAY_OPTIONS}
                    value={todayCheckin?.result ?? null}
                    onChange={(result: CheckinResult) =>
                      void run(() => answerToday(attempt.id, result, today, todayCheckin))
                    }
                    disabled={busy}
                  />
                </View>
                <AppText tone="secondary" size={14} style={{ marginTop: 8 }}>
                  {todayCheckin
                    ? 'You can switch today’s answer until midnight.'
                    : `Two skipped days in a row sets it aside. ${TRIED_DAYS_TO_COMPLETE} tried days completes it.`}
                </AppText>
              </>
            ) : (
              <AppText tone="secondary" size={15} style={{ marginTop: 4 }}>
                Today was part of your last go. Your new go can start tomorrow.
              </AppText>
            )}
          </>
        ) : null}

        {error ? (
          <View accessibilityLiveRegion="polite" className="mt-4 rounded-2xl border border-input-border bg-muted p-4 dark:border-dark-input-border dark:bg-dark-muted">
            <AppText accessibilityRole="alert" weight="medium" size={14}>
              {error}
            </AppText>
          </View>
        ) : null}

        <KeepsakesSection attemptId={attempt.id} />

        {history.length > 0 ? (
          <>
            <AppText accessibilityRole="header" weight="semibold" size={18} style={{ marginTop: 28 }}>
              Your days
            </AppText>
            <View className="mt-1">
              {history.map((checkin) => (
                <View
                  key={checkin.id}
                  accessible
                  accessibilityLabel={`${dayLabel(checkin.local_date)}, ${checkin.result === 'tried' ? 'tried' : 'skipped'}`}
                  className="min-h-12 flex-row items-center justify-between border-b border-border dark:border-dark-border"
                >
                  <AppText size={15}>{dayLabel(checkin.local_date)}</AppText>
                  <AppText tone="secondary" weight="medium" size={15}>
                    {checkin.result === 'tried' ? 'Tried' : 'Skipped'}
                  </AppText>
                </View>
              ))}
            </View>
          </>
        ) : null}

        <AppText accessibilityRole="header" weight="semibold" size={18} style={{ marginTop: 32 }}>
          Where is it at?
        </AppText>
        <AppText tone="secondary" size={14} style={{ marginTop: 2, marginBottom: 12 }}>
          This follows your answers above.
        </AppText>
        <StatusList value={attempt.status} />
      </>
    );
  }

  return (
    <AppScreen>
      <View className="pb-8 pt-3">
        <BackButton fallback="/profile" />
        <View className="mt-2.5">{body}</View>
      </View>
    </AppScreen>
  );
}
