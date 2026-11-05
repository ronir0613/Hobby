import assert from 'node:assert/strict';
import test from 'node:test';

import { afterFirstCheckin, withStatus } from './guest-lifecycle.ts';

const base = { status: 'planned', started_at: null, completed_at: null, dropped_at: null, updated_at: 't0' };

test('the first check-in makes a planned attempt active and stamps started_at', () => {
  const active = afterFirstCheckin(base, 't1');
  assert.equal(active.status, 'active');
  assert.equal(active.started_at, 't1');
  assert.equal(afterFirstCheckin(active, 't2'), active);
});

test('completed keeps started_at; planned clears every timestamp', () => {
  const done = withStatus(afterFirstCheckin(base, 't1'), 'completed', 't2');
  assert.deepEqual([done.started_at, done.completed_at, done.dropped_at], ['t1', 't2', null]);
  const again = withStatus(done, 'planned', 't3');
  assert.deepEqual([again.started_at, again.completed_at, again.dropped_at], [null, null, null]);
});

test('dropped keeps started_at and stamps dropped_at', () => {
  const dropped = withStatus(afterFirstCheckin(base, 't1'), 'dropped', 't2');
  assert.deepEqual([dropped.started_at, dropped.dropped_at, dropped.completed_at], ['t1', 't2', null]);
});

test('setting the same status changes nothing', () => {
  assert.equal(withStatus(base, 'planned', 't9'), base);
});
