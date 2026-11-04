import { SymbolView } from 'expo-symbols';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, View, useColorScheme } from 'react-native';
import { AppText } from '@/components/AppText';
import { darkColors, lightColors } from '@/theme/colors';
import { reminderSummary } from './reminders-model';
import { loadReminders, useRemindersStore } from './reminders-store';

/** Signed-in only: a Profile row that opens the reminders screen, with a one-line summary. */
export function RemindersRow() {
  const colors = useColorScheme() === 'dark' ? darkColors : lightColors;
  const status = useRemindersStore((state) => state.status);
  const form = useRemindersStore((state) => state.form);

  useFocusEffect(
    useCallback(() => {
      void loadReminders();
    }, []),
  );

  const summary = status === 'ready' ? reminderSummary(form) : status === 'error' ? 'Tap to see your reminders' : 'Loading…';

  return (
    <View className="mt-10">
      <AppText
        accessibilityRole="header"
        tone="secondary"
        weight="semibold"
        size={12}
        style={{ letterSpacing: 1.5, marginBottom: 12 }}
      >
        REMINDERS
      </AppText>
      <Pressable
        onPress={() => router.push('/reminders')}
        accessibilityRole="button"
        accessibilityLabel={`Reminders, ${summary}`}
        accessibilityHint="Opens reminder times and days"
        className="min-h-12 flex-row items-center gap-3 rounded-card border border-border bg-surface p-5 dark:border-dark-border dark:bg-dark-surface"
        style={({ pressed }) => ({ opacity: pressed ? 0.84 : 1 })}
      >
        <View className="flex-1">
          <AppText weight="semibold" size={18}>
            Gentle reminders
          </AppText>
          <AppText tone="secondary" size={14} style={{ marginTop: 4 }}>
            {summary}
          </AppText>
        </View>
        <SymbolView
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          tintColor={colors.foregroundSecondary}
          size={24}
        />
      </Pressable>
    </View>
  );
}
