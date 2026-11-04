import assert from 'node:assert/strict';
import test from 'node:test';

import { MAX_NOTE_LENGTH, cleanNote, groupByAttempt, keepsakesSummary, notePreview } from './keepsakes-model.ts';

test('cleanNote trims, rejects blank notes and caps the length', () => {
  assert.equal(cleanNote('  hello \n'), 'hello');
  assert.equal(cleanNote('   \n '), null);
  assert.equal(cleanNote('x'.repeat(MAX_NOTE_LENGTH + 5)).length, MAX_NOTE_LENGTH);
});

test('groupByAttempt keeps the order within each attempt', () => {
  const rows = [
    { id: 1, attempt_id: 'a' },
    { id: 2, attempt_id: 'b' },
    { id: 3, attempt_id: 'a' },
  ];
  assert.deepEqual(groupByAttempt(rows), {
    a: [rows[0], rows[2]],
    b: [rows[1]],
  });
});

test('keepsakesSummary counts notes and photos', () => {
  assert.equal(keepsakesSummary(0, 0), 'Nothing kept yet');
  assert.equal(keepsakesSummary(1, 0), '1 note');
  assert.equal(keepsakesSummary(2, 1), '2 notes · 1 photo');
  assert.equal(keepsakesSummary(0, 3), '3 photos');
});

test('notePreview shows the first line, shortened', () => {
  assert.equal(notePreview('First line\nSecond'), 'First line');
  assert.equal(notePreview('abcdefghij', 5), 'abcd…');
  assert.equal(notePreview('  short  '), 'short');
});
