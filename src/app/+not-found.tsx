import { Link, Stack } from 'expo-router';
import { Pressable, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { AppScreen } from '@/components/AppScreen';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <AppScreen>
        <View className="flex-1 items-center justify-center py-16">
          <AppText variant="title">This screen doesn&apos;t exist.</AppText>
          <Link href="/" asChild>
            <Pressable className="mt-6 min-h-12 justify-center rounded-full bg-accent px-6 dark:bg-dark-accent">
              <AppText tone="onAccent" weight="semibold">Back to Discover</AppText>
            </Pressable>
          </Link>
        </View>
      </AppScreen>
    </>
  );
}
