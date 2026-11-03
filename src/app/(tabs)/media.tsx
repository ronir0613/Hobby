import { View } from 'react-native';
import { ActionButton } from '@/components/ActionButton';
import { AppScreen } from '@/components/AppScreen';
import { AppText } from '@/components/AppText';

export default function MediaScreen() {
  return (
    <AppScreen>
      <View className="pb-8 pt-7">
        <AppText tone="secondary" weight="semibold" size={12} style={{ letterSpacing: 1.5 }}>
          LITTLE MOMENTS, KEPT
        </AppText>
        <AppText accessibilityRole="header" weight="medium" size={34} style={{ lineHeight: 40, marginTop: 13, letterSpacing: -0.7 }}>
          A home for the things you make.
        </AppText>
        <AppText tone="secondary" size={16} style={{ marginTop: 9 }}>
          Photos and notes from your experiments can live here, whenever you are ready to save them.
        </AppText>

        <View className="mt-8 min-h-72 justify-center rounded-[28px] border border-border bg-surface p-7 dark:border-dark-border dark:bg-dark-surface">
          <View className="mb-6 h-24 w-24 items-center justify-center self-center rounded-[26px] bg-secondary dark:bg-dark-secondary">
            <View className="h-14 w-14 rotate-[-8deg] rounded-2xl border-2 border-accent dark:border-dark-accent" />
            <View className="absolute h-14 w-14 translate-x-3 translate-y-2 rotate-[8deg] rounded-2xl border-2 border-accent-soft dark:border-dark-accent-soft" />
          </View>
          <AppText weight="semibold" size={22} style={{ textAlign: 'center' }}>
            Your keepsakes will go here.
          </AppText>
          <AppText tone="secondary" size={15} style={{ textAlign: 'center', marginTop: 8 }}>
            Saving photos and notes is part of a later step. For now, let a new idea be the beginning.
          </AppText>
        </View>

        <ActionButton label="Find an idea to try" href="/explore" style={{ marginTop: 22 }} />
      </View>
    </AppScreen>
  );
}
