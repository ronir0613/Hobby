import { create } from 'zustand';

import { useAuthStore } from '@/features/auth/auth-store';
import { hasNotificationPermission, updateReminderSettings } from '@/services/reminder-scheduler';
import { getReminderSettings, type ReminderSettings } from '@/services/reminders';
import { DEFAULT_REMINDERS, type ReminderForm } from './reminders-model';

type RemindersState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  form: ReminderForm;
  /** False when a reminder is on but the phone has notifications blocked for the app. */
  permitted: boolean;
};

const initial: RemindersState = { status: 'idle', form: DEFAULT_REMINDERS, permitted: true };

export const useRemindersStore = create<RemindersState>(() => initial);

const toForm = (row: ReminderSettings | null): ReminderForm =>
  row
    ? {
        morning_enabled: row.morning_enabled,
        morning_time: row.morning_time,
        evening_enabled: row.evening_enabled,
        evening_time: row.evening_time,
        weekdays: row.weekdays,
      }
    : DEFAULT_REMINDERS;

let inFlight: Promise<void> | null = null;

/** Loads (or reloads) the saved settings. A failed reload keeps what was shown. */
export function loadReminders() {
  if (inFlight) return inFlight;
  useRemindersStore.setState((s) => ({ status: s.status === 'ready' ? 'ready' : 'loading' }));
  const userId = useAuthStore.getState().session?.user.id;
  inFlight = Promise.all([getReminderSettings(), hasNotificationPermission()])
    .then(([row, permitted]) => {
      if (useAuthStore.getState().session?.user.id !== userId) return;
      useRemindersStore.setState({ status: 'ready', form: toForm(row), permitted });
    })
    .catch((error: unknown) => {
      if (__DEV__) console.warn('Reminder settings failed to load', error);
      useRemindersStore.setState((s) => ({ status: s.status === 'ready' ? 'ready' : 'error' }));
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export type SaveResult = 'saved' | 'permission-denied';

let saveQueue: Promise<unknown> = Promise.resolve();

/**
 * Shows the change straight away, saves it and reschedules this phone's reminders.
 * Saves run one after another; on failure (or a denied permission) the screen goes back
 * to what was saved and the error is passed on.
 */
export function saveReminders(changes: Partial<ReminderForm>): Promise<SaveResult> {
  const before = useRemindersStore.getState().form;
  useRemindersStore.setState({ form: { ...before, ...changes } });
  const run = async (): Promise<SaveResult> => {
    try {
      const result = await updateReminderSettings(changes);
      if (!result.ok) {
        useRemindersStore.setState({ form: before, permitted: false });
        return 'permission-denied';
      }
      useRemindersStore.setState({
        form: toForm(result.settings),
        permitted: result.sync.status !== 'no-permission',
      });
      return 'saved';
    } catch (error) {
      useRemindersStore.setState({ form: before });
      throw error;
    }
  };
  const next = saveQueue.then(run, run);
  saveQueue = next.catch(() => undefined);
  return next;
}

// Never show one account's settings to the next.
let lastUserId: string | null = null;
useAuthStore.subscribe((auth) => {
  const userId = auth.session?.user.id ?? null;
  if (userId === lastUserId) return;
  lastUserId = userId;
  useRemindersStore.setState(initial);
});
