// Pure helpers for the reminder settings screen (no Expo, no Supabase), unit tested with node --test.

import { describeWeekdays, normalizeWeekdays, parseTime } from '../../services/reminder-plan.ts';

export type ReminderForm = {
  morning_enabled: boolean;
  morning_time: string; // 'HH:MM' or 'HH:MM:SS'
  evening_enabled: boolean;
  evening_time: string;
  weekdays: number[]; // ISO, 1 = Monday … 7 = Sunday
};

/** What the screen shows before the user has saved anything (matches the column defaults). */
export const DEFAULT_REMINDERS: ReminderForm = {
  morning_enabled: false,
  morning_time: '08:00',
  evening_enabled: false,
  evening_time: '20:00',
  weekdays: [1, 2, 3, 4, 5, 6, 7],
};

/** Monday first, as the chips are laid out. */
export const WEEKDAY_CHIPS = [
  { iso: 1, short: 'M', name: 'Monday' },
  { iso: 2, short: 'T', name: 'Tuesday' },
  { iso: 3, short: 'W', name: 'Wednesday' },
  { iso: 4, short: 'T', name: 'Thursday' },
  { iso: 5, short: 'F', name: 'Friday' },
  { iso: 6, short: 'S', name: 'Saturday' },
  { iso: 7, short: 'S', name: 'Sunday' },
] as const;

/** Toggles a day. The last remaining day can't be turned off (returns the same list). */
export function toggleWeekday(days: readonly number[], iso: number): number[] {
  const current = normalizeWeekdays(days);
  if (current.includes(iso)) {
    return current.length === 1 ? current : current.filter((d) => d !== iso);
  }
  return normalizeWeekdays([...current, iso]);
}

/** 'HH:MM' for saving, from a picked Date (device wall-clock time). */
export const timeFromDate = (date: Date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

/** A Date today at the saved time, to seed the picker. */
export function dateFromTime(time: string, base = new Date()): Date {
  const { hour, minute } = parseTime(time);
  const date = new Date(base);
  date.setHours(hour, minute, 0, 0);
  return date;
}

/** '8:00 PM' or '20:00', following the locale. */
export function formatTime(time: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(dateFromTime(time));
}

/** The one line under "Reminders" on Profile. */
export function reminderSummary(form: ReminderForm, locale?: string): string {
  const days = describeWeekdays(form.weekdays);
  if (form.morning_enabled && form.evening_enabled) return `Mornings and evenings · ${days}`;
  if (form.morning_enabled) return `Mornings at ${formatTime(form.morning_time, locale)} · ${days}`;
  if (form.evening_enabled) return `Evenings at ${formatTime(form.evening_time, locale)} · ${days}`;
  return 'Off';
}
