import assert from 'node:assert/strict';
import test from 'node:test';

import { groupAttempts, sortAttempts } from './hobbies-model.ts';

test('groupAttempts makes one section per status in order, skipping empty ones', () => {
  const a = (id, status, created_at) => ({ id, status, created_at });
  const groups = groupAttempts([
    a('d', 'dropped', '2026-11-04'),
    a('c1', 'completed', '2026-11-01'),
    a('x', 'active', '2026-10-01'),
    a('c2', 'completed', '2026-11-03'),
  ]);
  assert.deepEqual(
    groups.map((g) => [g.status, g.attempts.map((x) => x.id)]),
    [
      ['active', ['x']],
      ['completed', ['c2', 'c1']],
      ['dropped', ['d']],
    ],
  );
  assert.deepEqual(groupAttempts([]), []);
});

test('sortAttempts puts active, then planned, completed, dropped; newest first within each', () => {
  const a = (id, status, created_at) => ({ id, status, created_at });
  const sorted = sortAttempts([
    a('d', 'dropped', '2026-11-04'),
    a('p1', 'planned', '2026-11-01'),
    a('c', 'completed', '2026-11-04'),
    a('p2', 'planned', '2026-11-03'),
    a('x', 'active', '2026-10-01'),
  ]);
  assert.deepEqual(sorted.map((x) => x.id), ['x', 'p2', 'p1', 'c', 'd']);
});

