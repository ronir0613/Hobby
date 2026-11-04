import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabIcon } from '@/components/TabIcon';
import { darkColors, lightColors } from '@/theme/colors';

export default function TabLayout() {
  const colors = useColorScheme() === 'dark' ? darkColors : lightColors;
  const { bottom } = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accentText,
        tabBarInactiveTintColor: colors.foregroundSecondary,
        tabBarLabelStyle: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12, marginBottom: 2 },
        tabBarItemStyle: { minHeight: 56, paddingTop: 7 },
        tabBarStyle: {
          height: 66 + bottom,
          paddingBottom: bottom,
          paddingTop: 3,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color }) => <TabIcon symbol={{ ios: 'leaf', android: 'spa' }} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <TabIcon symbol={{ ios: 'magnifyingglass', android: 'search' }} color={color} />,
        }}
      />
      <Tabs.Screen
        name="media"
        options={{
          title: 'Media',
          tabBarIcon: ({ color }) => (
            <TabIcon symbol={{ ios: 'photo.on.rectangle', android: 'photo_library' }} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabIcon symbol={{ ios: 'person', android: 'person' }} color={color} />,
        }}
      />
    </Tabs>
  );
}
