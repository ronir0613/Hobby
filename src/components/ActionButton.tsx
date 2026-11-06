import { Link, type Href } from 'expo-router';
import { View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

type ActionButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  href?: Href;
  variant?: 'primary' | 'secondary';
  style?: StyleProp<ViewStyle>;
};

export function ActionButton({ label, href, variant = 'primary', style, disabled, ...pressableProps }: ActionButtonProps) {
  const button = (
    <PressableScale
      accessibilityRole={href ? 'link' : 'button'}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      className={`min-h-12 items-center justify-center rounded-full px-6 ${
        variant === 'primary'
          ? 'bg-accent dark:bg-dark-accent'
          : 'border border-border bg-surface dark:border-dark-border dark:bg-dark-surface'
      }`}
      {...pressableProps}
    >
      <AppText
        weight="semibold"
        tone={variant === 'primary' ? 'onAccent' : 'primary'}
        accessibilityRole="none"
        style={{ textAlign: 'center' }}
      >
        {label}
      </AppText>
    </PressableScale>
  );

  // Layout style (margins) goes on a wrapper: Link asChild drops a Pressable's function style.
  return (
    <View style={style}>
      {href ? (
        <Link href={href} asChild>
          {button}
        </Link>
      ) : (
        button
      )}
    </View>
  );
}
