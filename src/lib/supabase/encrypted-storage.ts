// Encrypts what Supabase Auth stores (the session, the sign-in verifier) before it reaches
// AsyncStorage. Sessions are too large to rely on SecureStore directly, so SecureStore holds only
// the key. Pure and dependency-injected, so it can be unit tested with node --test.
//
// Failing here must never lock someone out: a value that can't be encrypted is stored as before,
// and one that can't be decrypted (the key is gone) just means signing in again.

export const ENCRYPTED_PREFIX = 'enc1:';

type PlainStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

export type EncryptedStorageDeps<Key> = {
  plain: PlainStorage;
  /** Reads the key, creating and saving it the first time. */
  loadKey: () => Promise<Key>;
  encrypt: (text: string, key: Key) => Promise<string>;
  decrypt: (sealed: string, key: Key) => Promise<string>;
};

export function createEncryptedStorage<Key>({ plain, loadKey, encrypt, decrypt }: EncryptedStorageDeps<Key>): PlainStorage {
  // One key per run, even when several calls arrive before the first one is saved.
  let keyPromise: Promise<Key> | null = null;
  const getKey = () => {
    keyPromise ??= loadKey().catch((error) => {
      keyPromise = null;
      throw error;
    });
    return keyPromise;
  };

  const seal = async (value: string) => ENCRYPTED_PREFIX + (await encrypt(value, await getKey()));

  return {
    async getItem(name) {
      const stored = await plain.getItem(name);
      if (stored === null) return null;

      if (!stored.startsWith(ENCRYPTED_PREFIX)) {
        // Saved by an earlier version: keeps the person signed in, and encrypts it from now on.
        await seal(stored)
          .then((sealed) => plain.setItem(name, sealed))
          .catch(() => undefined);
        return stored;
      }

      let key: Key;
      try {
        key = await getKey();
      } catch {
        return null; // a passing failure: keep the value and try again next time
      }
      try {
        return await decrypt(stored.slice(ENCRYPTED_PREFIX.length), key);
      } catch {
        await plain.removeItem(name); // can never be read again
        return null;
      }
    },

    async setItem(name, value) {
      const sealed = await seal(value).catch(() => value);
      await plain.setItem(name, sealed);
    },

    removeItem: (name) => plain.removeItem(name),
  };
}

/** Text to base64 and back, safe for names outside ASCII (AES input strings must be base64). */
export const textToBase64 = (text: string) => btoa(encodeURIComponent(text));
export const base64ToText = (base64: string) => decodeURIComponent(atob(base64));
