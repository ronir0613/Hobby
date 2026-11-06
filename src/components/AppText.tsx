import type { ComponentRef, Ref } from 'react';
import { Text, type TextProps } from 'react-native';
import { typeScale, type TypeRole } from '@/theme/colors';

type Weight = 'regular' | 'medium' | 'semibold' | 'bold';

type AppTextProps = TextProps & {
  /** Passed to the underlying Text (React 19 ref as a prop), e.g. to move screen reader focus. */
  ref?: Ref<ComponentRef<typeof Text>>;
  tone?: 'primary' | 'secondary' | 'accent' | 'onAccent';
  /** A role from the type scale in tokens.json (display, title, heading, body, small, label). */
  variant?: TypeRole;
  /** Overrides the variant's weight. */
  weight?: Weight;
  /** Legacy free size; prefer `variant`. */
  size?: number;
};

const fontFamilies = {
  regular: 'HankenGrotesk_400Regular',
  medium: 'HankenGrotesk_500Medium',
  semibold: 'HankenGrotesk_600SemiBold',
  bold: 'HankenGrotesk_700Bold',
} as const;

const toneClasses = {
  primary: 'text-foreground dark:text-dark-foreground',
  secondary: 'text-foreground-secondary dark:text-dark-foreground-secondary',
  accent: 'text-accent-text dark:text-dark-accent-text',
  onAccent: 'text-accent-foreground dark:text-dark-accent-foreground',
} as const;

export function AppText({ tone = 'primary', variant, weight, size, style, ...props }: AppTextProps) {
  const role = typeScale[variant ?? 'body'];
  const fontSize = variant || size === undefined ? role.size : size;
  const lineHeight = variant || size === undefined ? role.lineHeight : Math.round(size * 1.42);
  const fontWeight = weight ?? (variant ? (role.weight as Weight) : 'regular');

  return (
    <Text
      className={toneClasses[tone]}
      style={[
        {
          fontFamily: fontFamilies[fontWeight],
          fontSize,
          lineHeight,
          letterSpacing: variant ? role.letterSpacing : undefined,
        },
        style,
      ]}
      {...props}
    />
  );
}
