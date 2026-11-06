import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { ActionButton } from '@/components/ActionButton';
import { AppText } from '@/components/AppText';
import { AttemptCard } from '@/components/AttemptCard';
import { ListGroup, SectionTitle } from '@/components/ListGroup';
import { ErrorMessage, LoadingMessage } from '@/components/StatusMessage';
import { ensureCatalogue } from '@/features/explore/catalogue-store';
import { space } from '@/theme/colors';
import { groupAttempts } from './hobbies-model';
import { loadHobbies, useHobbiesStore } from './hobbies-store';

/** The attempts (account or this phone), refreshed whenever Profile comes into focus. */
export function MyHobbiesSection() {
  const status = useHobbiesStore((state) => state.status);
  const attempts = useHobbiesStore((state) => state.attempts);
  const checkins = useHobbiesStore((state) => state.checkins);
  const groups = useMemo(() => groupAttempts(attempts), [attempts]);

  useFocusEffect(
    useCallback(() => {
      ensureCatalogue(); // for interest names
      void loadHobbies();
    }, []),
  );
  // Signing in or out empties the list; load the new space's.
  useEffect(() => {
    if (status === 'idle') void loadHobbies();
  }, [status]);

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
  } else if (groups.length === 0) {
    body = (
      <View>
        <AppText tone="secondary">{'Nothing here yet. Tap “Try this” on an interest and it will wait here.'}</AppText>
        <ActionButton
          label="Browse interests"
          href="/explore"
          variant="secondary"
          style={{ marginTop: space['4'], alignSelf: 'flex-start' }}
        />
      </View>
    );
  } else {
    // Sorted by status (active, planned, completed, dropped); each row carries its status pill.
    body = (
      <ListGroup>
        {groups.flatMap((group) =>
          group.attempts.map((attempt) => (
            <AttemptCard key={attempt.id} attempt={attempt} checkins={checkins[attempt.id] ?? []} />
          )),
        )}
      </ListGroup>
    );
  }

  return (
    <View>
      <SectionTitle first>My hobbies</SectionTitle>
      {body}
    </View>
  );
}
