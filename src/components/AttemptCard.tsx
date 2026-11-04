import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { STATUS_LABELS } from '@/features/hobbies/hobbies-model';
import { useAttemptTitle } from '@/features/hobbies/use-attempt-title';
import type { Attempt } from '@/services/attempts';
import { latestCheckinLine, type Checkin } from '@/services/checkins';
import { AppText } from './AppText';
import { StatusPill } from './StatusPill';

export function AttemptCard({ attempt, checkins }: { attempt: Attempt; checkins: Checkin[] }) {
  const title = useAttemptTitle(attempt);
  const line = latestCheckinLine(checkins) ?? (attempt.status === 'planned' ? 'Not started yet' : null);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/attempt/[id]', params: { id: attempt.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${STATUS_LABELS[attempt.status]}${line ? `, ${line}` : ''}`}
      accessibilityHint="Opens check-ins and status"
      className="min-h-12 rounded-card border border-border bg-surface p-5 dark:border-dark-border dark:bg-dark-surface"
      style={({ pressed }) => ({ opacity: pressed ? 0.84 : 1 })}
    >
      <View className="flex-row items-start justify-between gap-3">
        <AppText weight="semibold" size={18} style={{ flex: 1 }}>
          {title}
        </AppText>
        <StatusPill status={attempt.status} />
      </View>
      {line ? (
        <AppText tone="secondary" size={14} style={{ marginTop: 4 }}>
          {line}
        </AppText>
      ) : null}
    </Pressable>
  );
}
