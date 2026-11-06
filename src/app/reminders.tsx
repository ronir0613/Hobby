import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Switch, View, useColorScheme } from 'react-native';
import { AppScreen } from '@/components/AppScreen';
import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { PressableScale } from '@/components/PressableScale';
import { ErrorMessage, LoadingMessage } from '@/components/StatusMessage';
import { useAuthStore } from '@/features/auth/auth-store';
import {
  WEEKDAY_CHIPS,
  dateFromTime,
  formatTime,
  timeFromDate,
  toggleWeekday,
  type ReminderForm,
} from '@/features/reminders/reminders-model';
import { loadReminders, saveReminders, useRemindersStore } from '@/features/reminders/reminders-store';
import { REMINDER_COPY, type ReminderKind } from '@/services/reminder-plan';
import { darkColors, lightColors } from '@/theme/colors';

const LABELS: Record<ReminderKind, { title: string; hint: string }> = {
  morning: { title: 'Morning nudge', hint: REMINDER_COPY.morning.title },
  evening: { title: 'Evening check-in', hint: REMINDER_COPY.evening.title },
};

type Notice = { title: string; body: string; settings?: boolean } | null;

export default function RemindersScreen() {
  const colors = useColorScheme() === 'dark' ? darkColors : lightColors;
  const signedIn = useAuthStore((state) => state.session !== null);
  const authReady = useAuthStore((state) => state.ready);
  const status = useRemindersStore((state) => state.status);
  const form = useRemindersStore((state) => state.form);
  const permitted = useRemindersStore((state) => state.permitted);
  const [notice, setNotice] = useState<Notice>(null);

  useFocusEffect(
    useCallback(() => {
      if (authReady) void loadReminders();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- signedIn: reload when the space (account or phone) changes
    }, [authReady, signedIn]),
  );

  async function save(changes: Partial<ReminderForm>) {
    setNotice(null);
    try {
      const result = await saveReminders(changes);
      if (result === 'permission-denied') {
        setNotice({
          title: 'Notifications are off for Hobby.',
          body: 'To get reminders, allow notifications for Hobby in your phone’s settings, then turn this on again.',
          settings: true,
        });
      }
    } catch (error) {
      if (__DEV__) console.warn('Saving reminder settings failed', error);
      setNotice({
        title: "That didn't save just now.",
        body: 'Check your connection and try again. Your earlier settings are still in place.',
      });
    }
  }

  function pickTime(kind: ReminderKind) {
    const key = kind === 'morning' ? 'morning_time' : 'evening_time';
    DateTimePickerAndroid.open({
      value: dateFromTime(form[key]),
      mode: 'time',
      onValueChange: (_event, date) => {
        if (!date) return;
        const time = timeFromDate(date);
        if (time !== form[key].slice(0, 5)) void save({ [key]: time });
      },
    });
  }

  let body;
  if (!authReady) {
    body = <LoadingMessage label="Opening reminders…" />;
  } else if (status === 'error') {
    body = (
      <ErrorMessage
        title="We couldn't load your reminders."
        body="Check your connection, then try again."
        onAction={() => void loadReminders()}
      />
    );
  } else if (status !== 'ready') {
    body = <LoadingMessage label="Loading your reminders…" />;
  } else {
    const anyOn = form.morning_enabled || form.evening_enabled;
    body = (
      <>
        <View className="rounded-card border border-border bg-surface dark:border-dark-border dark:bg-dark-surface">
          {(['morning', 'evening'] as const).map((kind, index) => {
            const enabledKey = kind === 'morning' ? 'morning_enabled' : 'evening_enabled';
            const time = form[kind === 'morning' ? 'morning_time' : 'evening_time'];
            const on = form[enabledKey];
            return (
              <View
                key={kind}
                className={`px-6 py-4 ${index > 0 ? 'border-t border-border dark:border-dark-border' : ''}`}
              >
                <View className="min-h-12 flex-row items-center gap-4">
                  <View className="flex-1">
                    <AppText weight="semibold">
                      {LABELS[kind].title}
                    </AppText>
                    <AppText tone="secondary" variant="small" style={{ marginTop: 4 }}>
                      {LABELS[kind].hint}
                    </AppText>
                  </View>
                  <Switch
                    accessibilityLabel={LABELS[kind].title}
                    value={on}
                    onValueChange={(value) => void save({ [enabledKey]: value })}
                    trackColor={{ false: colors.inputBorder, true: colors.accent }}
                    thumbColor={colors.accentForeground}
                  />
                </View>
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={`${LABELS[kind].title} time, ${formatTime(time)}`}
                  accessibilityHint="Opens the clock to change it"
                  onPress={() => pickTime(kind)}
                  className="min-h-12 flex-row items-center justify-between"
                  style={on ? null : { opacity: 0.75 }}
                >
                  <AppText weight="semibold">
                    {formatTime(time)}
                  </AppText>
                  {/* Keyed by time: Android drops the underline when a sibling's text changes. */}
                  <AppText key={time} tone="accent" weight="semibold" style={{ textDecorationLine: 'underline' }}>
                    Change
                  </AppText>
                </PressableScale>
              </View>
            );
          })}
        </View>

        <AppText
          accessibilityRole="header"
          variant="heading"
          style={{ marginTop: 32, marginBottom: 12 }}
        >
          On these days
        </AppText>
        <View className="flex-row justify-between">
          {WEEKDAY_CHIPS.map((day) => {
            const selected = form.weekdays.includes(day.iso);
            const onlyOne = selected && form.weekdays.length === 1;
            return (
              <PressableScale
                key={day.iso}
                accessibilityRole="checkbox"
                accessibilityLabel={day.name}
                accessibilityState={{ checked: selected }}
                accessibilityHint={onlyOne ? 'At least one day stays on' : undefined}
                onPress={() => {
                  const next = toggleWeekday(form.weekdays, day.iso);
                  if (next.length !== form.weekdays.length) void save({ weekdays: next });
                }}
                className={`h-12 w-12 items-center justify-center rounded-full border ${
                  selected
                    ? 'border-accent bg-accent dark:border-dark-accent dark:bg-dark-accent'
                    : 'border-border bg-surface dark:border-dark-border dark:bg-dark-surface'
                }`}
              >
                <AppText tone={selected ? 'onAccent' : 'primary'} weight="semibold" accessibilityRole="none">
                  {day.short}
                </AppText>
              </PressableScale>
            );
          })}
        </View>
        <AppText tone="secondary" variant="small" style={{ marginTop: 8 }}>
          Days you haven’t picked stay quiet.
        </AppText>

        {anyOn && !permitted && !notice ? (
          <View className="mt-6">
            <ErrorMessage
              title="Notifications are off for Hobby."
              body="Your reminders are saved, but the phone won’t show them until notifications are allowed for Hobby."
              actionLabel="Open phone settings"
              onAction={() => void Linking.openSettings()}
            />
          </View>
        ) : null}
        {notice ? (
          <View className="mt-6">
            <ErrorMessage
              title={notice.title}
              body={notice.body}
              actionLabel="Open phone settings"
              onAction={notice.settings ? () => void Linking.openSettings() : undefined}
            />
          </View>
        ) : null}
      </>
    );
  }

  return (
    <AppScreen>
      <View className="pb-8 pt-3">
        <BackButton fallback="/profile" />
        <AppText accessibilityRole="header" variant="display" style={{ marginTop: 8 }}>
          Reminders
        </AppText>
        <AppText tone="secondary" style={{ marginTop: 8, marginBottom: 32 }}>
          Gentle nudges on the days you choose. Skipping one is fine.
        </AppText>
        {body}
      </View>
    </AppScreen>
  );
}
