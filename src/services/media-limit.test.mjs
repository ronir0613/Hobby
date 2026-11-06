import assert from 'node:assert/strict';
import test from 'node:test';

import { keepsakeError, photosLeftCopy } from '../features/keepsakes/keepsakes-copy.ts';
import {
  MEDIA_LIMIT_BYTES,
  MediaLimitError,
  SMALLEST_PHOTO_BYTES,
  isMediaFull,
  limitLabel,
  photoFits,
  remainingLabel,
  roomLeft,
  splitByRoom,
  usageAfterDelete,
} from './media-limit.ts';

const MB = 1024 * 1024;
const usage = (usedBytes) => ({ usedBytes, limitBytes: MEDIA_LIMIT_BYTES });

test('the limit matches the server: 10 MiB', () => {
  assert.equal(MEDIA_LIMIT_BYTES, 10485760);
  assert.equal(limitLabel(null), '10 MB');
});

test('room left never goes below zero (an account already over the limit)', () => {
  assert.equal(roomLeft(usage(MEDIA_LIMIT_BYTES + 5)), 0);
});

test('full once less than the smallest photo is left', () => {
  assert.equal(isMediaFull(usage(MEDIA_LIMIT_BYTES - SMALLEST_PHOTO_BYTES)), false);
  assert.equal(isMediaFull(usage(MEDIA_LIMIT_BYTES - SMALLEST_PHOTO_BYTES + 1)), true);
  assert.equal(isMediaFull(usage(MEDIA_LIMIT_BYTES)), true);
});

test('unknown usage never disables the buttons or blocks a photo', () => {
  assert.equal(isMediaFull(null), false);
  assert.equal(photoFits(null, 5 * MB), true);
});

test('a photo fits up to the exact byte', () => {
  assert.equal(photoFits(usage(9 * MB), MB), true);
  assert.equal(photoFits(usage(9 * MB), MB + 1), false);
});

test('deleting a photo re-enables the buttons', () => {
  const full = usage(MEDIA_LIMIT_BYTES);
  assert.equal(isMediaFull(full), true);
  assert.equal(isMediaFull(usageAfterDelete(full, MB)), false);
  assert.equal(usageAfterDelete(null, MB), null);
  assert.equal(usageAfterDelete(usage(10), 50).usedBytes, 0);
});

test('remaining space shows only near the limit', () => {
  assert.equal(remainingLabel(null), null);
  assert.equal(remainingLabel(usage(7 * MB)), null);
  assert.equal(remainingLabel(usage(8 * MB)), '2 MB of 10 MB left');
  assert.equal(remainingLabel(usage(8.8 * MB)), '1.2 MB of 10 MB left');
  assert.equal(remainingLabel(usage(MEDIA_LIMIT_BYTES)), null); // the full message says it instead
});

test('splitByRoom keeps order and lets smaller photos past a large one', () => {
  const photos = [
    { id: 'a', file_size: 4 },
    { id: 'b', file_size: 8 },
    { id: 'c', file_size: 5 },
    { id: 'd', file_size: 2 },
  ];
  const { fits, leftOver } = splitByRoom(photos, 10);
  assert.deepEqual(fits.map((p) => p.id), ['a', 'c']);
  assert.deepEqual(leftOver.map((p) => p.id), ['b', 'd']);
});

test('the over-limit message counts the photos and says how to make room', () => {
  assert.equal(photosLeftCopy(1).title, '1 photo is still on this phone.');
  assert.equal(photosLeftCopy(3).title, '3 photos are still on this phone.');
  assert.match(photosLeftCopy(3).body, /Delete a photo/);
  assert.match(keepsakeError(new MediaLimitError()), /bigger than the space you have left/);
});

test('splitByRoom loses nothing', () => {
  const photos = [{ file_size: 3 }, { file_size: 3 }];
  assert.deepEqual(splitByRoom(photos, 0), { fits: [], leftOver: photos });
  assert.deepEqual(splitByRoom(photos, 6), { fits: photos, leftOver: [] });
});
