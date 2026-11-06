import { View } from 'react-native';
import { radius, space } from '@/theme/colors';
import { AppText } from './AppText';
import { CategoryArt } from './CategoryArt';
import { PressableScale } from './PressableScale';

type InterestCardProps = {
  interest: { name: string; category: string; categorySlug: string; description: string };
  onPress?: () => void;
};

/** An interest in a list: its category art, name, category and a short description. */
export function InterestCard({ interest, onPress }: InterestCardProps) {
  return (
    <PressableScale
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityHint={onPress ? 'Opens this interest' : undefined}
      disabled={!onPress}
      onPress={onPress}
      className="flex-row items-start rounded-card border border-border bg-surface dark:border-dark-border dark:bg-dark-surface"
      style={{ padding: space.tile, gap: space['4'] }}
    >
      <CategoryArt slug={interest.categorySlug} style={{ width: 72, height: 72, borderRadius: radius.tile - 4 }} />
      <View className="flex-1">
        <AppText weight="semibold">{interest.name}</AppText>
        <AppText variant="small" tone="secondary">
          {interest.category}
        </AppText>
        {interest.description ? (
          <AppText variant="small" style={{ marginTop: space['1'] }} numberOfLines={2}>
            {interest.description}
          </AppText>
        ) : null}
      </View>
    </PressableScale>
  );
}
