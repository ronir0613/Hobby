import { ActivityIndicator, View, useColorScheme } from 'react-native';
import { darkColors, lightColors } from '@/theme/colors';
import { ActionButton } from './ActionButton';
import { AppText } from './AppText';

export function LoadingMessage({ label }: { label: string }) {
  const colors = useColorScheme() === 'dark' ? darkColors : lightColors;
  return (
    <View accessibilityLiveRegion="polite" className="mt-2 flex-row items-center gap-3 py-6">
      <ActivityIndicator color={colors.accentText} />
      <AppText tone="secondary" size={15}>
        {label}
      </AppText>
    </View>
  );
}

/** Muted box (there is no danger colour yet) with an optional retry button. */
export function ErrorMessage({
  title,
  body,
  actionLabel = 'Try again',
  onAction,
  busy = false,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  busy?: boolean;
}) {
  return (
    <View
      accessibilityLiveRegion="polite"
      className="mt-2 rounded-card border border-input-border bg-muted p-6 dark:border-dark-input-border dark:bg-dark-muted"
    >
      <AppText accessibilityRole="alert" weight="semibold" size={18}>
        {title}
      </AppText>
      <AppText tone="secondary" size={15} style={{ marginTop: 7 }}>
        {body}
      </AppText>
      {onAction ? (
        <ActionButton
          label={busy ? 'Trying again…' : actionLabel}
          variant="secondary"
          onPress={onAction}
          disabled={busy}
          style={{ marginTop: 18, alignSelf: 'flex-start' }}
        />
      ) : null}
    </View>
  );
}
