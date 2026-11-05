import { requireOptionalNativeModule } from 'expo';

type GoogleIdNative = {
  /** Resolves to a Google ID token, or null when the user closes the sheet. */
  signIn(webClientId: string, hashedNonce: string): Promise<string | null>;
};

/** Null outside an Android build that includes the module (iOS, web, Expo Go). */
export default requireOptionalNativeModule<GoogleIdNative>('GoogleId');
