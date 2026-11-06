import assert from 'node:assert/strict';
import test from 'node:test';

import { ENCRYPTED_PREFIX, base64ToText, createEncryptedStorage, textToBase64 } from './encrypted-storage.ts';

function setup(overrides = {}) {
  const store = new Map();
  let keysMade = 0;
  const storage = createEncryptedStorage({
    plain: {
      getItem: async (k) => store.get(k) ?? null,
      setItem: async (k, v) => void store.set(k, v),
      removeItem: async (k) => void store.delete(k),
    },
    loadKey: async () => {
      keysMade += 1;
      return 'key';
    },
    encrypt: async (text) => `sealed(${text})`,
    decrypt: async (sealed) => sealed.slice('sealed('.length, -1),
    ...overrides,
  });
  return { store, storage, keysMade: () => keysMade };
}

const SESSION = '{"access_token":"secret"}';

test('nothing readable reaches AsyncStorage, and it reads back', async () => {
  const { store, storage } = setup();
  await storage.setItem('s', SESSION);
  assert.equal(store.get('s'), `${ENCRYPTED_PREFIX}sealed(${SESSION})`);
  assert.equal(await storage.getItem('s'), SESSION);
});

test('a session saved by an earlier version stays signed in and gets encrypted', async () => {
  const { store, storage } = setup();
  store.set('s', SESSION);
  assert.equal(await storage.getItem('s'), SESSION);
  assert.ok(store.get('s').startsWith(ENCRYPTED_PREFIX));
  assert.equal(await storage.getItem('s'), SESSION);
});

test('an earlier session still works when encryption fails', async () => {
  const { store, storage } = setup({
    encrypt: async () => {
      throw new Error('no crypto');
    },
  });
  store.set('s', SESSION);
  assert.equal(await storage.getItem('s'), SESSION);
  assert.equal(store.get('s'), SESSION);
});

test('sign-in still works when encryption fails', async () => {
  const { store, storage } = setup({
    loadKey: async () => {
      throw new Error('keystore unavailable');
    },
  });
  await storage.setItem('s', SESSION);
  assert.equal(store.get('s'), SESSION);
  assert.equal(await storage.getItem('s'), SESSION);
});

test('a value that can never be decrypted is removed: sign in again', async () => {
  const { store, storage } = setup({
    decrypt: async () => {
      throw new Error('wrong key');
    },
  });
  store.set('s', `${ENCRYPTED_PREFIX}xx`);
  assert.equal(await storage.getItem('s'), null);
  assert.equal(store.has('s'), false);
});

test('a passing key failure keeps the value for next time', async () => {
  let fail = true;
  const { store, storage } = setup({
    loadKey: async () => {
      if (fail) throw new Error('busy');
      return 'key';
    },
  });
  store.set('s', `${ENCRYPTED_PREFIX}sealed(${SESSION})`);
  assert.equal(await storage.getItem('s'), null);
  assert.equal(store.has('s'), true);
  fail = false;
  assert.equal(await storage.getItem('s'), SESSION);
});

test('calls at the same moment share one key', async () => {
  const { storage, keysMade } = setup();
  await Promise.all([storage.setItem('a', '1'), storage.setItem('b', '2'), storage.setItem('c', '3')]);
  assert.equal(keysMade(), 1);
});

test('sign-out removes the value', async () => {
  const { store, storage } = setup();
  await storage.setItem('s', SESSION);
  await storage.removeItem('s');
  assert.equal(store.has('s'), false);
  assert.equal(await storage.getItem('s'), null);
});

test('names outside ASCII survive the base64 step', () => {
  const text = '{"full_name":"रोनी Zoë ☕"}';
  assert.equal(base64ToText(textToBase64(text)), text);
  assert.match(textToBase64(text), /^[A-Za-z0-9+/=]+$/);
});
