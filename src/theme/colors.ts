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
};

export const lightColors: AppColors = tokens.light;
export const darkColors: AppColors = tokens.dark;

export function getAppColors(scheme: AppColorScheme): AppColors {
  return scheme === 'dark' ? darkColors : lightColors;
}
