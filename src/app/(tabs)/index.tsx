import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { ActionButton } from '@/components/ActionButton';
import { AppScreen } from '@/components/AppScreen';
import { AppText } from '@/components/AppText';
import { INTERESTS } from '@/data/interest-catalog';

export default function DiscoverScreen() {
  const firstInterest = INTERESTS[0];
  // Local ids match the catalogue slugs, so the detail screen loads the live interest.
  const openInterest = (slug: string) => router.push({ pathname: '/interest/[slug]', params: { slug } });

  return (
    <AppScreen>
      <View className="pb-7 pt-7">
        <AppText tone="secondary" weight="semibold" size={12} style={{ letterSpacing: 1.5 }}>
          MAKE ROOM FOR PLAY
        </AppText>
        <AppText accessibilityRole="header" weight="medium" size={38} style={{ lineHeight: 44, marginTop: 15, letterSpacing: -1.2 }}>
          A little curiosity can go a long way.
        </AppText>
        <AppText tone="secondary" size={17} style={{ marginTop: 14, maxWidth: 430 }}>
          Find an interest that feels like you, then try it in a small, unhurried way.
        </AppText>

        <Pressable
          accessibilityRole="button"
          accessibilityHint="Opens this interest"
          onPress={() => openInterest(firstInterest.id)}
          className="mt-8 overflow-hidden rounded-[28px] bg-secondary p-6 dark:bg-dark-secondary"
          style={({ pressed }) => ({ opacity: pressed ? 0.84 : 1 })}
        >
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            className="absolute -right-7 -top-8 h-36 w-36 rounded-full border-[18px] border-accent-soft dark:border-dark-accent-soft"
          />
          <AppText tone="secondary" weight="semibold" size={12} style={{ letterSpacing: 1.3 }}>
            A GENTLE PLACE TO START
          </AppText>
          <AppText weight="semibold" size={26} style={{ marginTop: 17 }}>
            {firstInterest.name}
          </AppText>
          <AppText size={16} style={{ marginTop: 5, maxWidth: 300 }}>
            {firstInterest.description}
          </AppText>
          <View className="mt-6 self-start rounded-full bg-surface px-4 py-2 dark:bg-dark-surface">
            <AppText weight="medium" size={13}>
              About {firstInterest.estimatedMinutes} minutes
            </AppText>
          </View>
          <View className="mt-6 border-t border-border/70 pt-4 dark:border-dark-border">
            <AppText tone="secondary" size={13}>
              TRY THIS
            </AppText>
            <AppText weight="medium" size={17} style={{ marginTop: 4, maxWidth: 420 }}>
              {firstInterest.starterIdea}
            </AppText>
          </View>
        </Pressable>

        <ActionButton label="Explore all interests" href="/explore" style={{ marginTop: 22 }} />

        <View className="mt-10">
          <AppText weight="semibold" size={21}>
            Or start anywhere
          </AppText>
          <AppText tone="secondary" size={15} style={{ marginTop: 4, marginBottom: 13 }}>
            No plan needed. Just follow a small spark.
          </AppText>
          <View className="flex-row gap-3">
            {INTERESTS.slice(4, 6).map((interest) => (
              <Pressable
                key={interest.id}
                accessibilityRole="button"
                accessibilityHint="Opens this interest"
                onPress={() => openInterest(interest.id)}
                className="min-h-24 flex-1 justify-between rounded-2xl border border-border bg-surface p-4 dark:border-dark-border dark:bg-dark-surface"
                style={({ pressed }) => ({ opacity: pressed ? 0.84 : 1 })}
              >
                <AppText weight="semibold" size={16}>
                  {interest.name}
                </AppText>
                <AppText tone="secondary" size={13}>
                  {interest.estimatedMinutes} min to begin
                </AppText>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </AppScreen>
  );
}
