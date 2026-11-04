import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { ActionButton } from '@/components/ActionButton';
import { AppText } from '@/components/AppText';
import { AttemptCard } from '@/components/AttemptCard';
import { ErrorMessage, LoadingMessage } from '@/components/StatusMessage';
import { ensureCatalogue } from '@/features/explore/catalogue-store';
import { sortAttempts } from './hobbies-model';
import { loadHobbies, useHobbiesStore } from './hobbies-store';

/** Signed-in only: the user's attempts, refreshed whenever Profile comes into focus. */
export function MyHobbiesSection() {
  const status = useHobbiesStore((state) => state.status);
  const attempts = useHobbiesStore((state) => state.attempts);
  const checkins = useHobbiesStore((state) => state.checkins);
  const sorted = useMemo(() => sortAttempts(attempts), [attempts]);

  useFocusEffect(
    useCallback(() => {
      ensureCatalogue(); // for interest names
      void loadHobbies();
    }, []),
  );

  let body;
  if (status === 'error') {
    body = (
      <ErrorMessage
        title="We couldn't load your hobbies."
        body="Check your connection, then try again."
        onAction={() => void loadHobbies()}
      />
    );
  } else if (status !== 'ready') {
    body = <LoadingMessage label="Loading your hobbies…" />;
  } else if (sorted.length === 0) {
    body = (
      <View className="rounded-card border border-border bg-surface p-6 dark:border-dark-border dark:bg-dark-surface">
        <AppText weight="semibold" size={18}>
          Nothing here yet.
        </AppText>
        <AppText tone="secondary" size={15} style={{ marginTop: 7 }}>
          {"When something catches your eye, tap “Try this” and it will wait here for you."}
        </AppText>
        <ActionButton label="Browse interests" href="/explore" variant="secondary" style={{ marginTop: 18 }} />
      </View>
    );
  } else {
    body = (
      <View className="gap-3">
        {sorted.map((attempt) => (
          <AttemptCard key={attempt.id} attempt={attempt} checkins={checkins[attempt.id] ?? []} />
        ))}
      </View>
    );
  }

  return (
    <View className="mt-8">
      <AppText
        accessibilityRole="header"
        tone="secondary"
        weight="semibold"
        size={12}
        style={{ letterSpacing: 1.5, marginBottom: 12 }}
      >
        MY HOBBIES
      </AppText>
      {body}
    </View>
  );
}
