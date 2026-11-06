import { useMemo } from 'react';
import { View, useColorScheme, type StyleProp, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { darkColors, lightColors } from '@/theme/colors';
import { categoryArtXml } from './art/category-art';

/**
 * The category's illustration, filling its box (cropped from the centre). Decorative: hidden
 * from screen readers, since the interest name always sits next to it.
 */
export function CategoryArt({ slug, style }: { slug: string; style?: StyleProp<ViewStyle> }) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const xml = useMemo(() => {
    const c = scheme === 'dark' ? darkColors : lightColors;
    return categoryArtXml(slug, {
      field: c.artField,
      paper: c.surface,
      leaf: c.artLeaf,
      leafDeep: c.artLeafDeep,
      sun: c.artSun,
      glow: c.artGlow,
      clay: c.artClay,
      ink: c.artInk,
    });
  }, [slug, scheme]);

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
