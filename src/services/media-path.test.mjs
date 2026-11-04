import assert from 'node:assert/strict';
import test from 'node:test';

import { attemptMediaFolder, buildMediaPath } from './media-path.ts';

const user = '11111111-1111-4111-8111-111111111111';
const attempt = '22222222-2222-4222-8222-222222222222';
const file = '33333333-3333-4333-8333-333333333333';

// Same pattern as media_assets_path_matches_owner and is_own_media_path().
const dbPattern = new RegExp(
  `^${user}/${attempt}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(jpg|jpeg|png|webp)$`,
  'i',
);

test('builds <user>/<attempt>/<uuid>.<ext> paths the database accepts', () => {
  for (const [mime, ext] of [['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp']]) {
    const path = buildMediaPath(user, attempt, file, mime);
    assert.equal(path, `${user}/${attempt}/${file}.${ext}`);
    assert.match(path, dbPattern);
  }
});

test('rejects ids that are not UUIDs', () => {
  assert.throws(() => buildMediaPath(user, attempt, 'photo', 'image/jpeg'));
  assert.throws(() => buildMediaPath('../x', attempt, file, 'image/jpeg'));
  assert.throws(() => attemptMediaFolder(user, ''));
});

test('folder is the path prefix', () => {
  assert.equal(attemptMediaFolder(user, attempt), `${user}/${attempt}`);
});
