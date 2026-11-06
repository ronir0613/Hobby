import tokens from './tokens.json' with { type: 'json' };

export type AppColorScheme = 'light' | 'dark';

export type AppColors = {
  background: string;
  surface: string;
  foreground: string;
  foregroundSecondary: string;
  accent: string;
  accentText: string;
  accentForeground: string;
  accentSoft: string;
  secondary: string;
  muted: string;
  border: string;
  inputBorder: string;
  /** Decorative illustration colours (never text). */
  artField: string;
  artLeaf: string;
  artLeafDeep: string;
  artSun: string;
  artGlow: string;
  artClay: string;
  artInk: string;
};

export const lightColors: AppColors = tokens.light;
export const darkColors: AppColors = tokens.dark;

export function getAppColors(scheme: AppColorScheme): AppColors {
  return scheme === 'dark' ? darkColors : lightColors;
}

export type TypeRole = keyof typeof tokens.type;
export const typeScale = tokens.type;
export const space = tokens.space;
export const radius = tokens.radius;
