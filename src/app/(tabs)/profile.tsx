import { View } from 'react-native';
import { ActionButton } from '@/components/ActionButton';
import { AppScreen } from '@/components/AppScreen';
import { AppText } from '@/components/AppText';

export default function ProfileScreen() {
  return (
    <AppScreen>
      <View className="pb-8 pt-7">
        <AppText tone="secondary" weight="semibold" size={12} style={{ letterSpacing: 1.5 }}>
          YOUR SPACE
        </AppText>
        <AppText accessibilityRole="header" weight="medium" size={35} style={{ lineHeight: 41, marginTop: 13, letterSpacing: -0.8 }}>
          Make it your own, one interest at a time.
        </AppText>
        <AppText tone="secondary" size={16} style={{ marginTop: 10 }}>
          This space will grow with you, without turning curiosity into a checklist.
        </AppText>

        <View className="mt-8 rounded-card border border-border bg-surface p-6 dark:border-dark-border dark:bg-dark-surface">
          <AppText weight="semibold" size={21}>
            Start wherever you are.
          </AppText>
          <AppText tone="secondary" size={15} style={{ marginTop: 8 }}>
            Sign-in and saved-interest settings are not connected yet. You can explore the local starter ideas without an account.
          </AppText>
        </View>

        <ActionButton label="Browse interests" href="/explore" style={{ marginTop: 22 }} />
      </View>
    </AppScreen>
  );
}
