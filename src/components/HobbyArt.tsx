import { useMemo } from 'react';
import { View, useColorScheme, type StyleProp, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { hobbyArtXml } from './art/hobby-art';

/**
 * The hobby's drawing, filling its box (cropped from the centre). Decorative: hidden from screen
 * readers, since the hobby's name always sits next to it.
 */
export function HobbyArt({ slug, style }: { slug: string; style?: StyleProp<ViewStyle> }) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const xml = useMemo(() => hobbyArtXml(slug, scheme), [slug, scheme]);

  return (
    <View
      style={[{ overflow: 'hidden' }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
    >
      <SvgXml xml={xml} width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />
    </View>
  );
}
