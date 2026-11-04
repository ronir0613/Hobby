import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import type { ColorValue } from 'react-native';

export type TabSymbol = { ios: SFSymbol; android: AndroidSymbol };

export function TabIcon({ symbol, color }: { symbol: TabSymbol; color: ColorValue }) {
  return (
    <SymbolView
      name={{ ...symbol, web: symbol.android }}
      tintColor={color}
      size={24}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
