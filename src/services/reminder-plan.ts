// Pure reminder helpers (no Expo, no Supabase), so they can be unit tested with node --test.

export type ReminderKind = 'morning' | 'evening';

export type ReminderPrefs = {
  morning_enabled: boolean;
  morning_time: string; // 'HH:MM' or 'HH:MM:SS', wall-clock time in `timezone`
  evening_enabled: boolean;
  evening_time: string;
  timezone: string; // IANA name, e.g. 'Asia/Kolkata'
  /** ISO weekdays, 1 = Monday … 7 = Sunday, in `timezone`. Missing means every day. */
  weekdays?: readonly number[];
};

export type PlannedReminder = {
  id: string;
  kind: ReminderKind;
  hour: number;
  minute: number;
  /** Expo weekday on the device (1 = Sunday … 7 = Saturday), or null for every day. */
  weekday: number | null;
  title: string;
  body: string;
};

export const ALL_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

/** Every notification we schedule uses this prefix, so we only ever cancel our own. */
export const REMINDER_ID_PREFIX = 'hobby-reminder-';
export const reminderId = (kind: ReminderKind, isoWeekday?: number) =>
  `${REMINDER_ID_PREFIX}${kind}${isoWeekday ? `-${isoWeekday}` : ''}`;

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
  const { hour, minute } = shiftToDevice(time, fromZone, toZone, now);
  return { hour, minute };
}

/** Like toDeviceTime, plus how many days the shift crossed (-1, 0 or 1). */
function shiftToDevice(
  time: { hour: number; minute: number },
  fromZone: string,
  toZone: string,
  now: Date,
): { hour: number; minute: number; dayShift: number } {
  if (!fromZone || !toZone || fromZone === toZone) return { ...time, dayShift: 0 };
  let shift: number;
  try {
    shift = timeZoneOffsetMinutes(toZone, now) - timeZoneOffsetMinutes(fromZone, now);
  } catch {
    return { ...time, dayShift: 0 };
  }
  const raw = time.hour * 60 + time.minute + shift;
  const total = ((raw % 1440) + 1440) % 1440;
  return { hour: Math.floor(total / 60), minute: total % 60, dayShift: Math.floor(raw / 1440) };
}

/** ISO weekday (1 = Monday) to Expo's weekly trigger weekday (1 = Sunday). */
export const isoToExpoWeekday = (iso: number) => (iso % 7) + 1;

/** Sorted, de-duplicated valid ISO weekdays. */
export function normalizeWeekdays(days: readonly number[] | undefined): number[] {
  if (!days) return [...ALL_WEEKDAYS];
  return [...new Set(days)].filter((d) => Number.isInteger(d) && d >= 1 && d <= 7).sort((a, b) => a - b);
}

/**
 * The reminders to schedule on this device. Every day → one daily trigger per reminder;
 * otherwise one weekly trigger per chosen day. Empty when nothing is on (or no settings yet).
 */
export function planReminders(
  prefs: ReminderPrefs | null,
  options: { deviceTimeZone: string; now?: Date },
): PlannedReminder[] {
  if (!prefs) return [];
  const now = options.now ?? new Date();
  const days = normalizeWeekdays(prefs.weekdays);
  const everyDay = days.length === 7;
  const wanted: [ReminderKind, boolean, string][] = [
    ['morning', prefs.morning_enabled, prefs.morning_time],
    ['evening', prefs.evening_enabled, prefs.evening_time],
  ];
  return wanted
    .filter(([, enabled]) => enabled)
    .flatMap(([kind, , time]): PlannedReminder[] => {
      const { hour, minute, dayShift } = shiftToDevice(
        parseTime(time),
        prefs.timezone,
        options.deviceTimeZone,
        now,
      );
      if (everyDay) return [{ id: reminderId(kind), kind, hour, minute, weekday: null, ...REMINDER_COPY[kind] }];
      return days.map((iso) => ({
        id: reminderId(kind, iso),
        kind,
        hour,
        minute,
        // A time zone shift past midnight moves the reminder to the neighbouring device day.
        weekday: isoToExpoWeekday((((iso - 1 + dayShift) % 7) + 7) % 7 + 1),
        ...REMINDER_COPY[kind],
      }));
    });
}

/** "Every day", "Weekdays", "Weekends" or "5 days", for the Profile summary. */
export function describeWeekdays(days: readonly number[] | undefined): string {
  const list = normalizeWeekdays(days);
  if (list.length === 7) return 'Every day';
  if (list.join() === '1,2,3,4,5') return 'Weekdays';
  if (list.join() === '6,7') return 'Weekends';
  return list.length === 1 ? '1 day' : `${list.length} days`;
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
