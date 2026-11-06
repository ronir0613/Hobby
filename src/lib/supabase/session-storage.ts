import AsyncStorage from '@react-native-async-storage/async-storage';
import { AESEncryptionKey, AESKeySize, AESSealedData, aesDecryptAsync, aesEncryptAsync } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { base64ToText, createEncryptedStorage, textToBase64 } from './encrypted-storage';

const KEY_NAME = 'hobby.session.key.v1';

async function loadKey() {
  const saved = await SecureStore.getItemAsync(KEY_NAME);
  if (saved) return AESEncryptionKey.import(saved, 'hex');
  const key = await AESEncryptionKey.generate(AESKeySize.AES256);
  await SecureStore.setItemAsync(KEY_NAME, await key.encoded('hex'));
  return key;
}

/** Where Auth keeps the session: encrypted on the phone. The web build is only for screen review. */
export const sessionStorage =
  Platform.OS === 'web'
    ? AsyncStorage
    : createEncryptedStorage<AESEncryptionKey>({
        plain: AsyncStorage,
        loadKey,
        encrypt: async (text, key) => (await aesEncryptAsync(textToBase64(text), key)).combined('base64'),
        decrypt: async (sealed, key) =>
          base64ToText(await aesDecryptAsync(AESSealedData.fromCombined(sealed), key, { output: 'base64' })),
      });
