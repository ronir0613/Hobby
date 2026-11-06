import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { AppState, Platform } from 'react-native';

import { supabase } from '@/lib/supabase/client';
import {
  REMINDER_ID_PREFIX,
  enablesReminder,
  planReminders,
  type PlannedReminder,
} from '@/services/reminder-plan';
import { accountData, dataFor, type HobbyData } from '@/services/data-source';
import type { ReminderSettings, ReminderSettingsChanges } from '@/services/reminders';

// Daily reminders are local notifications scheduled on this device from the user's
// notification_preferences row, or from the guest's settings on this phone when signed out.
// Nothing is sent from a server.

export const REMINDER_CHANNEL_ID = 'reminders'; // matches defaultChannel in app.json

const supported = Platform.OS === 'android' || Platform.OS === 'ios';

export const deviceTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  // Android 13+ shows no permission prompt until a channel exists. Once created,
  // only name/description can change, so pick calm settings up front.
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: 'Gentle reminders',
    description: 'Optional morning and evening nudges you set yourself.',
    importance: AndroidImportance.DEFAULT,
  });
}

export async function hasNotificationPermission() {
  if (!supported) return false;
  const { granted } = await Notifications.getPermissionsAsync();
  return granted;
}

/** Shows the OS prompt (Android 13+ POST_NOTIFICATIONS) if needed. Only call when the user turns a reminder on. */
export async function requestNotificationPermission() {
  if (!supported) return false;
  await ensureChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const { granted } = await Notifications.requestPermissionsAsync();
  return granted;
}

/** Cancels only the reminders this app scheduled. */
export async function cancelAllReminders() {
  if (!supported) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(REMINDER_ID_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

async function schedule(reminder: PlannedReminder) {
  await Notifications.scheduleNotificationAsync({
    identifier: reminder.id,
    content: {
      title: reminder.title,
      body: reminder.body,
      data: { kind: reminder.kind },
    },
    trigger:
      reminder.weekday === null
        ? {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: reminder.hour,
            minute: reminder.minute,
            channelId: REMINDER_CHANNEL_ID,
          }
        : {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: reminder.weekday,
            hour: reminder.hour,
            minute: reminder.minute,
            channelId: REMINDER_CHANNEL_ID,
          },
  });
}

export type ReminderSyncResult =
  | { status: 'scheduled'; reminders: PlannedReminder[] }
  | { status: 'no-permission'; reminders: PlannedReminder[] }
  | { status: 'unsupported' };

let lastSyncedTimeZone: string | null = null;
let syncQueue: Promise<unknown> = Promise.resolve();

/** The account's settings when signed in, the phone's otherwise. */
async function currentSettings() {
  const { data } = await supabase.auth.getSession();
  return dataFor(data.session !== null).getReminderSettings();
}

/**
 * Replaces this device's scheduled reminders with what the settings say.
 * Reads the current space's settings unless given. Never prompts for permission.
 * Calls run one after another so a quick toggle can't leave duplicates behind.
 */
export function syncReminders(settings?: ReminderSettings | null): Promise<ReminderSyncResult> {
  const run = async (): Promise<ReminderSyncResult> => {
    if (!supported) return { status: 'unsupported' };
    const prefs = settings === undefined ? await currentSettings() : settings;
    const timeZone = deviceTimeZone();
    const plan = planReminders(prefs, { deviceTimeZone: timeZone });

    await cancelAllReminders();
    lastSyncedTimeZone = timeZone;
    if (plan.length === 0) return { status: 'scheduled', reminders: [] };
    if (!(await hasNotificationPermission())) return { status: 'no-permission', reminders: plan };

    await ensureChannel();
    for (const reminder of plan) await schedule(reminder);
    return { status: 'scheduled', reminders: plan };
  };
  const next = syncQueue.then(run, run);
  syncQueue = next.catch(() => undefined);
  return next;
}

export type UpdateRemindersResult =
  | { ok: true; settings: ReminderSettings; sync: ReminderSyncResult }
  | { ok: false; reason: 'permission-denied' };

/**
 * Use this (not saveReminderSettings) from the reminders screen. Turning a
 * reminder on asks for permission first; if the user says no, nothing is saved.
 * Saves the phone's time zone with the times so they mean "local time here".
 */
export async function updateReminderSettings(
  changes: ReminderSettingsChanges,
  data: HobbyData = accountData,
): Promise<UpdateRemindersResult> {
  if (enablesReminder(changes) && !(await requestNotificationPermission())) {
    return { ok: false, reason: 'permission-denied' };
  }
  const settings = await data.saveReminderSettings({ timezone: deviceTimeZone(), ...changes });
  const sync = await syncReminders(settings);
  return { ok: true, settings, sync };
}

let started = false;

/**
 * Call once at app start. Schedules on launch and sign-in (the account's settings) and on sign-out
 * (the guest's, usually none), and reschedules if the phone's time zone changed.
 * Returns a cleanup function.
 */
export function startReminderSync() {
  if (!supported || started) return () => {};
  started = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  const report = (error: unknown) => {
    if (__DEV__) console.warn('[reminders] sync failed', error);
  };

  const { data } = supabase.auth.onAuthStateChange((event) => {
    // Supabase warns against awaiting other Supabase calls inside this callback.
    setTimeout(() => {
      if (event === 'SIGNED_OUT' || event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
        // syncReminders cancels what is scheduled first, then follows the current space.
        syncReminders().catch(report);
      }
    }, 0);
  });

  const appState = AppState.addEventListener('change', (state) => {
    if (state !== 'active' || lastSyncedTimeZone === null) return;
    if (deviceTimeZone() !== lastSyncedTimeZone) syncReminders().catch(report);
  });

  return () => {
    data.subscription.unsubscribe();
    appState.remove();
    started = false;
  };
}
