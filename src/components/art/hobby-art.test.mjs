import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { hobbyArtXml, hobbySlugsWithArt } from './hobby-art.ts';

const migration = readFileSync(new URL('../../../supabase/migrations/20261106090000_catalogue_100.sql', import.meta.url), 'utf8');
const catalogueSlugs = [...migration.match(/insert into _kept_slugs \(slug\) values([\s\S]*?);/)[1].matchAll(/\('([^']+)'\)/g)].map((m) => m[1]);

test('every hobby in the catalogue has its own drawing', () => {
  assert.equal(catalogueSlugs.length, 100);
  assert.deepEqual([...hobbySlugsWithArt].sort(), [...catalogueSlugs].sort());
});

test('no two hobbies share a drawing', () => {
  const drawings = hobbySlugsWithArt.map((slug) => hobbyArtXml(slug, 'light'));
  assert.equal(new Set(drawings).size, 100);
});

test('the field follows the theme', () => {
  assert.notEqual(hobbyArtXml('chess', 'light'), hobbyArtXml('chess', 'dark'));
});

test('a hobby no longer listed still gets a drawing', () => {
  assert.match(hobbyArtXml('meditation', 'light'), /^<svg /);
});
