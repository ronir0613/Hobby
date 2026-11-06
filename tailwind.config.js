const colors = require('./src/theme/tokens.json');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/app/**/*.{ts,tsx}', './src/components/**/*.{ts,tsx}', './src/features/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        background: colors.light.background,
        surface: colors.light.surface,
        foreground: colors.light.foreground,
        'foreground-secondary': colors.light.foregroundSecondary,
        accent: colors.light.accent,
        'accent-text': colors.light.accentText,
        'accent-foreground': colors.light.accentForeground,
        'accent-soft': colors.light.accentSoft,
        secondary: colors.light.secondary,
        muted: colors.light.muted,
        border: colors.light.border,
        'input-border': colors.light.inputBorder,
        'dark-background': colors.dark.background,
        'dark-surface': colors.dark.surface,
        'dark-foreground': colors.dark.foreground,
        'dark-foreground-secondary': colors.dark.foregroundSecondary,
        'dark-accent': colors.dark.accent,
        'dark-accent-text': colors.dark.accentText,
        'dark-accent-foreground': colors.dark.accentForeground,
        'dark-accent-soft': colors.dark.accentSoft,
        'dark-secondary': colors.dark.secondary,
        'dark-muted': colors.dark.muted,
        'dark-border': colors.dark.border,
        'dark-input-border': colors.dark.inputBorder,
      },
      fontFamily: {
        sans: ['HankenGrotesk_400Regular'],
        medium: ['HankenGrotesk_500Medium'],
        semibold: ['HankenGrotesk_600SemiBold'],
        bold: ['HankenGrotesk_700Bold'],
      },
      borderRadius: { card: '24px', tile: '16px' },
      // NativeWind counts 1rem as 14 on native, so these would come out as 42, 49 and 56dp.
      minHeight: { 12: '48px', 14: '56px', 16: '64px' },
    },
  },
  plugins: [],
};
