import { View, useColorScheme } from 'react-native';
import {
  ATTEMPT_STATUSES,
  STATUS_DESCRIPTIONS,
  STATUS_LABELS,
  type AttemptStatus,
} from '@/features/hobbies/hobbies-model';
import { darkColors, lightColors } from '@/theme/colors';
import { AppText } from './AppText';

/** Read-only: the four statuses with how each is reached, the current one marked. */
export function StatusList({ value }: { value: AttemptStatus }) {
  const colors = useColorScheme() === 'dark' ? darkColors : lightColors;
  return (
    <View
      accessible
      accessibilityLabel={`Now ${STATUS_LABELS[value]}: ${STATUS_DESCRIPTIONS[value]}`}
      className="overflow-hidden rounded-card border border-border bg-surface dark:border-dark-border dark:bg-dark-surface"
    >
      {ATTEMPT_STATUSES.map((status, index) => {
        const current = status === value;
        return (
          <View
            key={status}
            className={`min-h-12 flex-row items-center gap-4 px-6 py-3.5 ${
              index > 0 ? 'border-t border-border dark:border-dark-border' : ''
            } ${current ? 'bg-secondary dark:bg-dark-secondary' : ''}`}
          >
            <View
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: current ? colors.accentText : colors.border }}
            />
            <View className="flex-1">
              <AppText weight={current ? 'semibold' : 'medium'}  tone={current ? 'primary' : 'secondary'}>
                {STATUS_LABELS[status]}
                {current ? ' · now' : ''}
              </AppText>
              <AppText tone="secondary" variant="small">
                {STATUS_DESCRIPTIONS[status]}
              </AppText>
            </View>
          </View>
        );
      })}
    </View>
  );
}
