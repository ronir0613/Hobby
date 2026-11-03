import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { darkColors, lightColors } from '@/theme/colors';

export default function TabLayout() {
  const colors = useColorScheme() === 'dark' ? darkColors : lightColors;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accentText,
        tabBarInactiveTintColor: colors.foregroundSecondary,
        tabBarLabelStyle: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12, marginBottom: 2 },
        tabBarItemStyle: { minHeight: 56, paddingTop: 7 },
        tabBarStyle: {
          height: 66,
          paddingTop: 3,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Discover' }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
      <Tabs.Screen name="media" options={{ title: 'Media' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
