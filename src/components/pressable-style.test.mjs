import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.name.endsWith('.tsx') ? [path] : [];
  });
}

// NativeWind on Android ignores a style function when className is present, so its padding,
// margins and press feedback vanish, while web still shows them. PressableScale is the way in.
test('no component passes a style function', () => {
  const offenders = sourceFiles('src').filter((file) => /style=\{\s*\(\s*\{/.test(readFileSync(file, 'utf8')));
  assert.deepEqual(offenders, []);
});
