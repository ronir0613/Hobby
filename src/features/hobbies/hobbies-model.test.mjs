import assert from 'node:assert/strict';
import test from 'node:test';

import { sortAttempts } from './hobbies-model.ts';

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

