import { View } from 'react-native';
import type { Interest } from '@/data/interest-catalog';
import { AppText } from './AppText';

export function InterestCard({ interest }: { interest: Interest }) {
  return (
    <View className="mb-3 rounded-card border border-border bg-surface p-5 dark:border-dark-border dark:bg-dark-surface">
      <AppText tone="secondary" weight="semibold" size={12} style={{ letterSpacing: 1.1, textTransform: 'uppercase' }}>
        {interest.category}
      </AppText>
      <AppText weight="semibold" size={21} style={{ marginTop: 7 }}>
        {interest.name}
      </AppText>
      <AppText tone="secondary" size={15} style={{ marginTop: 5 }}>
        {interest.description}
      </AppText>
      <View className="mt-4 rounded-2xl bg-muted px-4 py-3 dark:bg-dark-muted">
        <AppText tone="secondary" size={13}>
          A first small step
        </AppText>
        <AppText weight="medium" size={15} style={{ marginTop: 2 }}>
          {interest.starterIdea}
        </AppText>
      </View>
    </View>
  );
}
