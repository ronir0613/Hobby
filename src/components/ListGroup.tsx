import { SymbolView } from 'expo-symbols';
import { Children, Fragment, type ReactNode } from 'react';
import { View, useColorScheme, type PressableProps } from 'react-native';
import { darkColors, lightColors, space } from '@/theme/colors';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

/** One rounded surface holding rows, with hairlines between them instead of a box per row. */
export function ListGroup({ children }: { children: ReactNode }) {
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View className="overflow-hidden rounded-card border border-border bg-surface dark:border-dark-border dark:bg-dark-surface">
      {rows.map((row, index) => (
        <Fragment key={index}>
          {index > 0 ? (
            <View
              className="h-px bg-border dark:bg-dark-border"
              style={{ marginLeft: space.card }}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          ) : null}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

type ListRowProps = Omit<PressableProps, 'children' | 'style'> & {
  title: string;
  detail?: string | null;
  leading?: ReactNode;
  trailing?: ReactNode;
  /** Shows a chevron after the text (default on). */
  chevron?: boolean;
};

/** A tappable row: optional leading art, a title and a one-line detail, then a chevron. */
export function ListRow({ title, detail, leading, trailing, chevron = true, ...props }: ListRowProps) {
  const colors = useColorScheme() === 'dark' ? darkColors : lightColors;
  return (
    <PressableScale
      pressedScale={0.99}
      className="min-h-16 flex-row items-center gap-4"
      style={{ paddingHorizontal: space.card, paddingVertical: space['4'] }}
      {...props}
    >
      {leading}
      <View className="flex-1">
        <AppText weight="semibold">{title}</AppText>
        {detail ? (
          <AppText variant="small" tone="secondary" style={{ marginTop: space['1'] }}>
            {detail}
          </AppText>
        ) : null}
      </View>
      {trailing}
      {chevron ? (
        <SymbolView
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          tintColor={colors.foregroundSecondary}
          size={24}
        />
      ) : null}
    </PressableScale>
  );
}

/** A section heading on the type scale, with the gap below it built in. */
export function SectionTitle({ children, first = false }: { children: string; first?: boolean }) {
  return (
    <AppText
      accessibilityRole="header"
      variant="heading"
      style={{ marginTop: first ? 0 : space['12'], marginBottom: space['4'] }}
    >
      {children}
    </AppText>
  );
}
