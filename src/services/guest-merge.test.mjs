import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createSteps,
  findAccountAttempt,
  isAlreadyThere,
  missingDays,
  planGuestMerge,
} from './guest-merge.ts';

const user = '11111111-1111-4111-8111-111111111111';
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const attempt = (n, interest, status = 'planned', started_at = null) => ({
  id: id(n),
  interest_id: interest,
  status,
  started_at,
});
const checkin = (n, attemptN, local_date, result = 'tried', created_at = `${local_date}T10:00:00Z`) => ({
  id: id(n),
  attempt_id: id(attemptN),
  local_date,
  result,
  created_at,
});

test('a planned guest attempt with no days is just inserted', () => {
  assert.deepEqual(createSteps(attempt(1, 'knit'), []), [{ op: 'insert-attempt', id: id(1), interest_id: 'knit' }]);
});

test('an active guest attempt is inserted, then its days (which make it active)', () => {
  const a = attempt(1, 'knit', 'active', '2026-11-03T10:00:00Z');
  const steps = createSteps(a, [checkin(11, 1, '2026-11-04', 'skipped'), checkin(10, 1, '2026-11-03')]);
  assert.deepEqual(steps, [
    { op: 'insert-attempt', id: id(1), interest_id: 'knit' },
    {
      op: 'insert-checkins',
      checkins: [
        { id: id(10), local_date: '2026-11-03', result: 'tried' },
        { id: id(11), local_date: '2026-11-04', result: 'skipped' },
      ],
    },
  ]);
});

test('completed and dropped are set after the days', () => {
  const a = attempt(1, 'knit', 'dropped', '2026-11-03T10:00:00Z');
  const steps = createSteps(a, [checkin(10, 1, '2026-11-03', 'skipped'), checkin(11, 1, '2026-11-04', 'skipped')]);
  assert.deepEqual(steps.at(-1), { op: 'set-status', status: 'dropped' });
  assert.equal(steps.length, 3);
});

test('days from an earlier go go in first, then back to planned, then the current go', () => {
  // Dropped on 1–2 Nov, given another go, checked in again on 4 Nov.
  const a = attempt(1, 'knit', 'active', '2026-11-04T09:00:00Z');
  const steps = createSteps(a, [
    checkin(10, 1, '2026-11-01', 'skipped'),
    checkin(11, 1, '2026-11-02', 'skipped'),
    checkin(12, 1, '2026-11-04', 'tried', '2026-11-04T09:00:00Z'),
  ]);
  assert.deepEqual(
    steps.map((s) => (s.op === 'insert-checkins' ? s.checkins.map((c) => c.local_date) : s.op === 'set-status' ? s.status : s.op)),
    ['insert-attempt', ['2026-11-01', '2026-11-02'], 'planned', ['2026-11-04']],
  );
});

test('a planned guest attempt with only old days ends planned again', () => {
  const a = attempt(1, 'knit', 'planned', null);
  const steps = createSteps(a, [checkin(10, 1, '2026-11-01')]);
  assert.deepEqual(steps.slice(1).map((s) => s.op), ['insert-checkins', 'set-status']);
  assert.deepEqual(steps.at(-1), { op: 'set-status', status: 'planned' });
});

test('finds the account attempt by id first (an unfinished run), then by interest', () => {
  const cloud = [
    { id: id(5), interest_id: 'knit' },
    { id: id(1), interest_id: 'paint' },
  ];
  assert.equal(findAccountAttempt({ id: id(1), interest_id: 'knit' }, cloud).id, id(1));
  assert.equal(findAccountAttempt({ id: id(2), interest_id: 'knit' }, cloud).id, id(5));
  assert.equal(findAccountAttempt({ id: id(3), interest_id: null }, cloud), undefined);
  assert.equal(findAccountAttempt({ id: id(4), interest_id: 'bake' }, cloud), undefined);
});

test('the account wins on days both have; guest days are added once each', () => {
  const added = missingDays(
    [checkin(10, 1, '2026-11-03'), checkin(11, 1, '2026-11-04', 'skipped'), checkin(12, 1, '2026-11-05')],
    ['2026-11-04'],
  );
  assert.deepEqual(added.map((c) => c.local_date), ['2026-11-03', '2026-11-05']);
});

test('plans join an existing interest and create the rest, moving notes and photos along', () => {
  const guest = {
    attempts: [attempt(1, 'knit', 'active', '2026-11-04T10:00:00Z'), attempt(2, 'paint')],
    checkins: [checkin(10, 1, '2026-11-04'), checkin(11, 1, '2026-11-05', 'skipped')],
    notes: [{ id: id(20), attempt_id: id(1), content: 'Cast on!' }],
    photos: [{ id: id(30), attempt_id: id(1), storage_path: 'guest-photos/x.jpg', file_size: 1200 }],
  };
  const cloud = {
    attempts: [{ id: id(9), interest_id: 'knit' }],
    checkins: [{ attempt_id: id(9), local_date: '2026-11-04' }],
  };
  const [knit, paint] = planGuestMerge(guest, cloud, user);

  assert.equal(knit.kind, 'join');
  assert.equal(knit.targetId, id(9));
  assert.deepEqual(knit.steps, [
    { op: 'insert-checkins', checkins: [{ id: id(11), local_date: '2026-11-05', result: 'skipped' }] },
  ]);
  assert.deepEqual(knit.notes, [{ id: id(20), content: 'Cast on!' }]);
  assert.deepEqual(knit.photos, [
    { id: id(30), localPath: 'guest-photos/x.jpg', cloudPath: `${user}/${id(9)}/${id(30)}.jpg`, file_size: 1200 },
  ]);

  assert.equal(paint.kind, 'create');
  assert.equal(paint.targetId, id(2));
  assert.deepEqual(paint.steps, [{ op: 'insert-attempt', id: id(2), interest_id: 'paint' }]);
});

test('a retry after a half-finished run only adds what is missing', () => {
  const guest = {
    attempts: [attempt(1, 'knit', 'active', '2026-11-04T10:00:00Z')],
    checkins: [checkin(10, 1, '2026-11-04'), checkin(11, 1, '2026-11-05')],
    notes: [],
    photos: [],
  };
  // The first run inserted the attempt (under the guest id) and the first day, then stopped.
  const cloud = {
    attempts: [{ id: id(1), interest_id: 'knit' }],
    checkins: [{ attempt_id: id(1), local_date: '2026-11-04' }],
  };
  const [plan] = planGuestMerge(guest, cloud, user);
  assert.equal(plan.kind, 'join');
  assert.equal(plan.targetId, id(1));
  assert.deepEqual(plan.steps, [
    { op: 'insert-checkins', checkins: [{ id: id(11), local_date: '2026-11-05', result: 'tried' }] },
  ]);

  // Everything already there: nothing to write.
  const done = planGuestMerge(guest, { ...cloud, checkins: [...cloud.checkins, { attempt_id: id(1), local_date: '2026-11-05' }] }, user);
  assert.deepEqual(done[0].steps, []);
});

test('custom attempts never join another attempt', () => {
  const guest = { attempts: [attempt(1, null)], checkins: [], notes: [], photos: [] };
  const [plan] = planGuestMerge(guest, { attempts: [{ id: id(9), interest_id: null }], checkins: [] }, user);
  assert.equal(plan.kind, 'create');
});

test('duplicates and existing files count as already uploaded', () => {
  assert.equal(isAlreadyThere({ code: '23505' }), true);
  assert.equal(isAlreadyThere({ statusCode: '409', message: 'The resource already exists' }), true);
  assert.equal(isAlreadyThere({ message: 'Network request failed' }), false);
  assert.equal(isAlreadyThere(null), false);
});
