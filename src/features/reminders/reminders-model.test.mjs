import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_REMINDERS,
  dateFromTime,
  formatTime,
  reminderSummary,
  timeFromDate,
  toggleWeekday,
} from './reminders-model.ts';

test('toggleWeekday adds and removes days, keeping them sorted', () => {
  assert.deepEqual(toggleWeekday([1, 2, 3], 2), [1, 3]);
  assert.deepEqual(toggleWeekday([5, 1], 3), [1, 3, 5]);
});

test('toggleWeekday keeps the last day on', () => {
  assert.deepEqual(toggleWeekday([4], 4), [4]);
});

test('time round-trips through the picker Date', () => {
  assert.equal(timeFromDate(dateFromTime('07:05:00')), '07:05');
  assert.equal(timeFromDate(dateFromTime('21:30')), '21:30');
});

// Intl may put a narrow no-break space before AM/PM.
const plain = (text) => text.replace(/\s/g, ' ');

test('formatTime follows the locale', () => {
  assert.equal(plain(formatTime('20:00:00', 'en-US')), '8:00 PM');
  assert.equal(formatTime('08:05', 'en-GB'), '8:05');
});

test('reminderSummary', () => {
  assert.equal(reminderSummary(DEFAULT_REMINDERS), 'Off');
  assert.equal(
    plain(reminderSummary({ ...DEFAULT_REMINDERS, evening_enabled: true, weekdays: [1, 2, 3, 4, 5] }, 'en-US')),
    'Evenings at 8:00 PM · Weekdays',
  );
  assert.equal(
    plain(reminderSummary({ ...DEFAULT_REMINDERS, morning_enabled: true }, 'en-US')),
    'Mornings at 8:00 AM · Every day',
  );
  assert.equal(
    reminderSummary({ ...DEFAULT_REMINDERS, morning_enabled: true, evening_enabled: true, weekdays: [6, 7] }),
    'Mornings and evenings · Weekends',
  );
});
