import assert from 'node:assert/strict';
import test from 'node:test';

import {
  REMINDER_COPY,
  REMINDER_ID_PREFIX,
  enablesReminder,
  parseTime,
  planReminders,
  timeZoneOffsetMinutes,
  toDeviceTime,
} from './reminder-plan.ts';

const prefs = (overrides = {}) => ({
  morning_enabled: false,
  morning_time: '08:00:00',
  evening_enabled: false,
  evening_time: '20:00:00',
  timezone: 'Asia/Kolkata',
  ...overrides,
});

test('parseTime accepts HH:MM and the HH:MM:SS Postgres returns', () => {
  assert.deepEqual(parseTime('08:00'), { hour: 8, minute: 0 });
  assert.deepEqual(parseTime('20:30:00'), { hour: 20, minute: 30 });
  assert.deepEqual(parseTime('7:05'), { hour: 7, minute: 5 });
  assert.deepEqual(parseTime('23:59:59.000'), { hour: 23, minute: 59 });
});

test('parseTime rejects nonsense', () => {
  for (const bad of ['', '24:00', '12:60', '8am', '12', 'aa:bb']) {
    assert.throws(() => parseTime(bad), /Invalid reminder time/);
  }
});

test('timeZoneOffsetMinutes handles fixed, half-hour and DST zones', () => {
  const winter = new Date('2026-01-15T12:00:00Z');
  const summer = new Date('2026-07-15T12:00:00Z');
  assert.equal(timeZoneOffsetMinutes('UTC', winter), 0);
  assert.equal(timeZoneOffsetMinutes('Asia/Kolkata', winter), 330);
  assert.equal(timeZoneOffsetMinutes('Europe/London', winter), 0);
  assert.equal(timeZoneOffsetMinutes('Europe/London', summer), 60);
  assert.equal(timeZoneOffsetMinutes('America/New_York', winter), -300);
});

test('toDeviceTime keeps the time when zones match', () => {
  const now = new Date('2026-11-04T00:00:00Z');
  assert.deepEqual(toDeviceTime({ hour: 8, minute: 0 }, 'Asia/Kolkata', 'Asia/Kolkata', now), {
    hour: 8,
    minute: 0,
  });
});

test('toDeviceTime shifts to the phone zone and wraps past midnight', () => {
  const now = new Date('2026-11-04T00:00:00Z');
  // 08:00 in Kolkata (UTC+5:30) is 02:30 UTC.
  assert.deepEqual(toDeviceTime({ hour: 8, minute: 0 }, 'Asia/Kolkata', 'UTC', now), {
    hour: 2,
    minute: 30,
  });
  // 02:00 in Kolkata is 20:30 the previous day in UTC.
  assert.deepEqual(toDeviceTime({ hour: 2, minute: 0 }, 'Asia/Kolkata', 'UTC', now), {
    hour: 20,
    minute: 30,
  });
});

test('toDeviceTime falls back to the saved time for an unknown zone', () => {
  const now = new Date('2026-11-04T00:00:00Z');
  assert.deepEqual(toDeviceTime({ hour: 9, minute: 15 }, 'Not/AZone', 'UTC', now), {
    hour: 9,
    minute: 15,
  });
});

test('planReminders is empty with no settings or nothing on', () => {
  assert.deepEqual(planReminders(null, { deviceTimeZone: 'UTC' }), []);
  assert.deepEqual(planReminders(prefs(), { deviceTimeZone: 'Asia/Kolkata' }), []);
});

test('planReminders schedules only the enabled reminders, with stable ids', () => {
  const plan = planReminders(prefs({ evening_enabled: true, evening_time: '21:15:00' }), {
    deviceTimeZone: 'Asia/Kolkata',
  });
  assert.equal(plan.length, 1);
  assert.deepEqual(plan[0], {
    id: `${REMINDER_ID_PREFIX}evening`,
    kind: 'evening',
    hour: 21,
    minute: 15,
    ...REMINDER_COPY.evening,
  });
});

test('planReminders schedules both and converts to the device zone', () => {
  const plan = planReminders(prefs({ morning_enabled: true, evening_enabled: true }), {
    deviceTimeZone: 'UTC',
    now: new Date('2026-11-04T00:00:00Z'),
  });
  assert.deepEqual(
    plan.map(({ kind, hour, minute }) => ({ kind, hour, minute })),
    [
      { kind: 'morning', hour: 2, minute: 30 },
      { kind: 'evening', hour: 14, minute: 30 },
    ],
  );
});

test('reminder copy stays gentle (no streak or guilt words)', () => {
  const text = Object.values(REMINDER_COPY)
    .map((c) => `${c.title} ${c.body}`)
    .join(' ')
    .toLowerCase();
  for (const word of ['streak', 'miss', "don't break", 'lose', 'behind']) {
    assert.equal(text.includes(word), false, `copy should not mention "${word}"`);
  }
});

test('enablesReminder is true only when a change turns a reminder on', () => {
  assert.equal(enablesReminder({ morning_enabled: true }), true);
  assert.equal(enablesReminder({ evening_enabled: true, morning_enabled: false }), true);
  assert.equal(enablesReminder({ morning_enabled: false }), false);
  assert.equal(enablesReminder({}), false);
});
