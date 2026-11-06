import { View, useColorScheme } from 'react-native';
import { STATUS_LABELS, type AttemptStatus } from '@/features/hobbies/hobbies-model';
import { darkColors, lightColors } from '@/theme/colors';
import { AppText } from './AppText';

const background: Record<AttemptStatus, string> = {
  active: 'bg-accent-soft dark:bg-dark-accent-soft',
  planned: 'border border-border bg-muted dark:border-dark-border dark:bg-dark-muted',
  completed: 'bg-secondary dark:bg-dark-secondary',
  dropped: 'border border-border bg-muted dark:border-dark-border dark:bg-dark-muted',
};

export function StatusPill({ status }: { status: AttemptStatus }) {
  const colors = useColorScheme() === 'dark' ? darkColors : lightColors;
  return (
    <View className={`rounded-full px-3 py-1 ${background[status]}`}>
      <AppText
        variant="small"
        weight="semibold"
        tone={status === 'dropped' ? 'secondary' : 'primary'}
        style={status === 'active' ? { color: colors.accentText } : undefined}
      >
        {STATUS_LABELS[status]}
      </AppText>
    </View>
  );
}
