import { Text, type TextProps } from 'react-native';

type AppTextProps = TextProps & {
  tone?: 'primary' | 'secondary' | 'onAccent';
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  size?: number;
};

const fontFamilies = {
  regular: 'HankenGrotesk_400Regular',
  medium: 'HankenGrotesk_500Medium',
  semibold: 'HankenGrotesk_600SemiBold',
  bold: 'HankenGrotesk_700Bold',
} as const;

export function AppText({
  tone = 'primary',
  weight = 'regular',
  size = 16,
  style,
  ...props
}: AppTextProps) {
  const colorClass =
    tone === 'secondary'
      ? 'text-foreground-secondary dark:text-dark-foreground-secondary'
      : tone === 'onAccent'
        ? 'text-accent-foreground dark:text-dark-accent-foreground'
        : 'text-foreground dark:text-dark-foreground';

  return (
    <Text
      className={colorClass}
      style={[{ fontFamily: fontFamilies[weight], fontSize: size, lineHeight: size * 1.42 }, style]}
      {...props}
    />
  );
}
