import assert from 'node:assert/strict';
import test from 'node:test';

import { daysBetween, shouldAskAfterSkips, toLocalDate } from './checkin-rules.ts';

const day = (local_date, result) => ({ local_date, result });

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
