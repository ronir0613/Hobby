// Pure reminder helpers (no Expo, no Supabase), so they can be unit tested with node --test.

export type ReminderKind = 'morning' | 'evening';

export type ReminderPrefs = {
  morning_enabled: boolean;
  morning_time: string; // 'HH:MM' or 'HH:MM:SS', wall-clock time in `timezone`
  evening_enabled: boolean;
  evening_time: string;
  timezone: string; // IANA name, e.g. 'Asia/Kolkata'
};

export type PlannedReminder = {
  id: string;
  kind: ReminderKind;
  hour: number;
  minute: number;
  title: string;
  body: string;
};

/** Every notification we schedule uses this prefix, so we only ever cancel our own. */
export const REMINDER_ID_PREFIX = 'hobby-reminder-';
export const reminderId = (kind: ReminderKind) => `${REMINDER_ID_PREFIX}${kind}`;

// Gentle, no-streak copy. Nothing about missing days or keeping a run going.
export const REMINDER_COPY: Record<ReminderKind, { title: string; body: string }> = {
  morning: {
    title: 'A little room for something new',
    body: 'If you feel like it, your hobby is here today. No pressure either way.',
  },
  evening: {
    title: 'How did today feel?',
    body: 'Tried it or skipped it, both are fine. Jot down a note if you like.',
  },
};

/** Parses 'HH:MM' or 'HH:MM:SS' (as Postgres returns `time`). Throws on anything else. */
export function parseTime(value: string): { hour: number; minute: number } {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/.exec(value.trim());
  if (!match) throw new Error(`Invalid reminder time: ${value}`);
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) throw new Error(`Invalid reminder time: ${value}`);
  return { hour, minute };
}

/** Minutes `timeZone` is ahead of UTC at `at` (e.g. 330 for Asia/Kolkata). */
export function timeZoneOffsetMinutes(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
  const atMinute = Math.floor(at.getTime() / 60_000) * 60_000;
  return Math.round((asUtc - atMinute) / 60_000);
}

/**
 * Converts a wall-clock time in `fromZone` to the same instant in `toZone`, using the
 * offsets at `now`. Daily triggers fire in device time, so this matters when the
 * saved time zone differs from the phone's. Re-run on launch to pick up DST changes.
 * Falls back to the unconverted time if either zone is unknown.
 */
export function toDeviceTime(
  time: { hour: number; minute: number },
  fromZone: string,
  toZone: string,
  now: Date,
): { hour: number; minute: number } {
  if (!fromZone || !toZone || fromZone === toZone) return time;
  let shift: number;
  try {
    shift = timeZoneOffsetMinutes(toZone, now) - timeZoneOffsetMinutes(fromZone, now);
  } catch {
    return time;
  }
  const total = (((time.hour * 60 + time.minute + shift) % 1440) + 1440) % 1440;
  return { hour: Math.floor(total / 60), minute: total % 60 };
}

/** The daily reminders to schedule on this device. Empty when nothing is on (or no settings yet). */
export function planReminders(
  prefs: ReminderPrefs | null,
  options: { deviceTimeZone: string; now?: Date },
): PlannedReminder[] {
  if (!prefs) return [];
  const now = options.now ?? new Date();
  const wanted: [ReminderKind, boolean, string][] = [
    ['morning', prefs.morning_enabled, prefs.morning_time],
    ['evening', prefs.evening_enabled, prefs.evening_time],
  ];
  return wanted
    .filter(([, enabled]) => enabled)
    .map(([kind, , time]) => ({
      id: reminderId(kind),
      kind,
      ...toDeviceTime(parseTime(time), prefs.timezone, options.deviceTimeZone, now),
      ...REMINDER_COPY[kind],
    }));
}

/**
 * True when a change turns a reminder on. That is the only moment we ask for
 * notification permission (the OS skips the prompt if it is already granted).
 */
export function enablesReminder(
  changes: Partial<Pick<ReminderPrefs, 'morning_enabled' | 'evening_enabled'>>,
): boolean {
  return changes.morning_enabled === true || changes.evening_enabled === true;
}
