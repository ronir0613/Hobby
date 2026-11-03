import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function AppScreen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background dark:bg-dark-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, alignItems: 'center', paddingHorizontal: 22, paddingBottom: 28 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="w-full max-w-[560px] flex-1">{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}
