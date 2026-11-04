import { Pressable, View } from 'react-native';
import { AppText } from './AppText';

type InterestCardProps = {
  interest: { name: string; category: string; description: string; starterIdea?: string };
  onPress?: () => void;
};

export function InterestCard({ interest, onPress }: InterestCardProps) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityHint={onPress ? 'Opens this interest' : undefined}
      disabled={!onPress}
      onPress={onPress}
      className="mb-3 rounded-card border border-border bg-surface p-5 dark:border-dark-border dark:bg-dark-surface"
      style={({ pressed }) => ({ opacity: pressed ? 0.84 : 1 })}
    >
      <AppText tone="secondary" weight="semibold" size={12} style={{ letterSpacing: 1.1, textTransform: 'uppercase' }}>
        {interest.category}
      </AppText>
      <AppText weight="semibold" size={21} style={{ marginTop: 7 }}>
        {interest.name}
      </AppText>
      {interest.description ? (
        <AppText tone="secondary" size={15} style={{ marginTop: 5 }}>
          {interest.description}
        </AppText>
      ) : null}
      {interest.starterIdea ? (
        <View className="mt-4 rounded-2xl bg-muted px-4 py-3 dark:bg-dark-muted">
          <AppText tone="secondary" size={13}>
            A first small step
          </AppText>
          <AppText weight="medium" size={15} style={{ marginTop: 2 }}>
            {interest.starterIdea}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}
