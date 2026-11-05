import { completeAuthFromUrl, isAuthCallbackUrl } from '@/services/auth';

// Auth links (email confirmation, password reset) have no screen.
// Finish sign-in from the link and land on home; listen with onAuthChange for the result.
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    if (isAuthCallbackUrl(path)) {
      const url = path.includes('://') ? path : `hobby://${path.replace(/^\//, '')}`;
      completeAuthFromUrl(url).catch((error) => console.warn('Auth link failed:', error));
      return '/';
    }
    return path;
  } catch {
    return '/';
  }
}
