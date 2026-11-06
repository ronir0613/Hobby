import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { ListRow } from '@/components/ListGroup';
import { reminderSummary } from './reminders-model';
import { loadReminders, useRemindersStore } from './reminders-store';

/** A Profile row that opens the reminders screen, with a one-line summary. */
export function RemindersRow() {
  const status = useRemindersStore((state) => state.status);
  const form = useRemindersStore((state) => state.form);

  useFocusEffect(
    useCallback(() => {
      void loadReminders();
    }, []),
  );
  // Signing in or out empties the settings; load the new space's.
  useEffect(() => {
    if (status === 'idle') void loadReminders();
  }, [status]);

  const summary = status === 'ready' ? reminderSummary(form) : status === 'error' ? 'Tap to see your reminders' : 'Loading…';

  return (
    <ListRow
      title="Gentle reminders"
      detail={summary}
      onPress={() => router.push('/reminders')}
      accessibilityRole="button"
      accessibilityLabel={`Reminders, ${summary}`}
      accessibilityHint="Opens reminder times and days"
    />
  );
}
