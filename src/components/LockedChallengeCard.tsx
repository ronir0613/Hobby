import { SymbolView } from 'expo-symbols';
import { View, useColorScheme } from 'react-native';
import { darkColors, lightColors, space } from '@/theme/colors';
import { AppText } from './AppText';

/** A preview of the "100 days, 100 hobbies" challenge. Locked: it has no action yet. */
export function LockedChallengeCard() {
  const colors = useColorScheme() === 'dark' ? darkColors : lightColors;
  return (
    <View
      accessible
      accessibilityLabel="100 days, 100 hobbies. Locked. One new hobby a day. Coming later."
      className="flex-row items-center rounded-card border border-border bg-muted dark:border-dark-border dark:bg-dark-muted"
      style={{ marginTop: space['6'], padding: space.card, gap: space['4'] }}
    >
      <SymbolView
        name={{ ios: 'lock', android: 'lock', web: 'lock' }}
        tintColor={colors.foregroundSecondary}
        size={24}
      />
      <View className="flex-1">
        <AppText weight="semibold">100 days, 100 hobbies</AppText>
        <AppText variant="small" tone="secondary" style={{ marginTop: space['1'] }}>
          One new hobby a day. Coming later.
        </AppText>
      </View>
    </View>
  );
}
