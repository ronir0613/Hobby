import assert from 'node:assert/strict';
import test from 'node:test';

import {
  checkinDays,
  dayLabel,
  daysBetween,
  latestCheckinLine,
  shouldAskAfterSkips,
  currentRun,
  statusAfterCheckins,
  toLocalDate,
} from './checkin-rules.ts';

const day = (local_date, result) => ({ local_date, result });
const now = new Date(2026, 10, 4, 9, 0); // 4 Nov 2026, local time

test('toLocalDate uses the device calendar date', () => {
  assert.equal(toLocalDate(new Date(2026, 0, 5, 23, 30)), '2026-01-05');
  assert.equal(toLocalDate(new Date(2026, 11, 31, 0, 1)), '2026-12-31');
});

test('daysBetween counts calendar days across months and DST', () => {
  assert.equal(daysBetween('2026-10-31', '2026-11-01'), 1);
  assert.equal(daysBetween('2026-03-07', '2026-03-09'), 2);
  assert.equal(daysBetween('2026-11-04', '2026-11-03'), -1);
});

test('asks after two skipped days in a row', () => {
  assert.equal(shouldAskAfterSkips([day('2026-11-03', 'skipped'), day('2026-11-04', 'skipped')]), true);
});

test('order of the input does not matter', () => {
  const checkins = [day('2026-11-04', 'skipped'), day('2026-11-01', 'tried'), day('2026-11-03', 'skipped')];
  assert.equal(shouldAskAfterSkips(checkins), true);
});

test('does not ask with fewer than two check-ins', () => {
  assert.equal(shouldAskAfterSkips([]), false);
  assert.equal(shouldAskAfterSkips([day('2026-11-04', 'skipped')]), false);
});

test('does not ask when the latest check-in was tried', () => {
  assert.equal(
    shouldAskAfterSkips([day('2026-11-02', 'skipped'), day('2026-11-03', 'skipped'), day('2026-11-04', 'tried')]),
    false,
  );
});

test('does not ask when the skips are not on back-to-back days', () => {
  assert.equal(shouldAskAfterSkips([day('2026-11-01', 'skipped'), day('2026-11-04', 'skipped')]), false);
});

test('with today, ignores an old pair of skips', () => {
  const checkins = [day('2026-10-20', 'skipped'), day('2026-10-21', 'skipped')];
  assert.equal(shouldAskAfterSkips(checkins, '2026-11-04'), false);
  assert.equal(shouldAskAfterSkips(checkins, '2026-10-22'), true);
  assert.equal(shouldAskAfterSkips(checkins, '2026-10-21'), true);
});

test('checkinDays gives today and yesterday on the device calendar, across months', () => {
  assert.deepEqual(checkinDays(now), { today: '2026-11-04', yesterday: '2026-11-03' });
  assert.deepEqual(checkinDays(new Date(2026, 2, 1, 0, 5)), { today: '2026-03-01', yesterday: '2026-02-28' });
});

test('dayLabel names today and yesterday', () => {
  assert.equal(dayLabel('2026-11-04', now), 'Today');
  assert.equal(dayLabel('2026-11-03', now), 'Yesterday');
  assert.notEqual(dayLabel('2026-11-01', now), 'Today');
});

test('latestCheckinLine describes the newest check-in', () => {
  assert.equal(latestCheckinLine([], now), null);
  assert.equal(latestCheckinLine([day('2026-11-03', 'skipped'), day('2026-11-04', 'tried')], now), 'Tried today');
  assert.equal(latestCheckinLine([day('2026-11-03', 'skipped')], now), 'Skipped yesterday');
  assert.match(latestCheckinLine([day('2026-11-01', 'tried')], now), /^Tried on /);
});

const at = (local_date, result, created_at) => ({ local_date, result, created_at });

test('currentRun keeps only check-ins since the current go started', () => {
  const checkins = [
    at('2026-11-02', 'skipped', '2026-11-02T10:00:00Z'),
    at('2026-11-03', 'skipped', '2026-11-03T10:00:00Z'),
    at('2026-11-04', 'tried', '2026-11-04T09:00:00Z'),
  ];
  assert.deepEqual(currentRun(checkins, null), []);
  assert.deepEqual(currentRun(checkins, '2026-11-04T09:00:00Z').map((c) => c.local_date), ['2026-11-04']);
  assert.equal(currentRun(checkins, '2026-11-01T00:00:00Z').length, 3);
});

test('two skipped days in a row drop an active hobby', () => {
  assert.equal(statusAfterCheckins('active', [day('2026-11-03', 'skipped'), day('2026-11-04', 'skipped')]), 'dropped');
  assert.equal(statusAfterCheckins('active', [day('2026-11-01', 'skipped'), day('2026-11-04', 'skipped')]), 'active');
  assert.equal(statusAfterCheckins('active', [day('2026-11-03', 'skipped'), day('2026-11-04', 'tried')]), 'active');
});

test('the 7th tried day completes a hobby, skips in between do not reset it', () => {
  const tried = (n) => Array.from({ length: n }, (_, i) => day(`2026-10-${String(10 + i * 2).padStart(2, '0')}`, 'tried'));
  assert.equal(statusAfterCheckins('active', tried(6)), 'active');
  assert.equal(statusAfterCheckins('active', [...tried(6), day('2026-10-21', 'skipped'), day('2026-10-23', 'tried')]), 'completed');
});

test('planned, completed and dropped hobbies are not moved by check-ins', () => {
  const skips = [day('2026-11-03', 'skipped'), day('2026-11-04', 'skipped')];
  assert.equal(statusAfterCheckins('planned', skips), 'planned');
  assert.equal(statusAfterCheckins('completed', skips), 'completed');
  assert.equal(statusAfterCheckins('dropped', skips), 'dropped');
});

