import { SymbolView } from 'expo-symbols';
import { router, type Href } from 'expo-router';
import { Pressable, useColorScheme } from 'react-native';
import { darkColors, lightColors } from '@/theme/colors';

/** Goes back, or to `fallback` when the screen was opened directly (deep link, relaunch). */
export function BackButton({ fallback }: { fallback: Href }) {
  const colors = useColorScheme() === 'dark' ? darkColors : lightColors;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Go back"
      onPress={() => (router.canGoBack() ? router.back() : router.replace(fallback))}
      hitSlop={8}
      className="h-12 w-12 items-center justify-center rounded-full"
      style={({ pressed }) => ({ marginLeft: -12, opacity: pressed ? 0.7 : 1 })}
    >
      <SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} tintColor={colors.foreground} size={24} />
    </Pressable>
  );
}
