import { useState, type ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

type PressableScaleProps = Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  /** How far it shrinks while held; small surfaces can take a little more. */
  pressedScale?: number;
};

/**
 * The app's press feedback: a small shrink and dim while a finger is down. With reduce motion on,
 * only the dim remains.
 *
 * It tracks the pressed state itself and passes a plain style on purpose. On native, NativeWind
 * turns `className` into styles and merges them with `style`: a Reanimated animated style replaced
 * the classes (cards lost their surface), and a `style` function is ignored (cards lost their
 * padding and margins, and presses showed nothing). Both work on web, so only a phone shows this.
 */
export function PressableScale({
  children,
  style,
  pressedScale = 0.98,
  disabled,
  onPressIn,
  onPressOut,
  ...props
}: PressableScaleProps) {
  const reduceMotion = useReducedMotion();
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      {...props}
      disabled={disabled}
      onPressIn={(event) => {
        setPressed(true);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPressed(false);
        onPressOut?.(event);
      }}
      style={[
        style,
        disabled ? { opacity: 0.6 } : pressed ? { opacity: 0.88 } : null,
        pressed && !disabled && !reduceMotion ? { transform: [{ scale: pressedScale }] } : null,
      ]}
    >
      {children}
    </Pressable>
  );
}
