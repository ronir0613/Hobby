import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, View, useColorScheme } from 'react-native';
import { AppText } from '@/components/AppText';
import { useAuthStore } from '@/features/auth/auth-store';
import { darkColors, lightColors } from '@/theme/colors';
import { quizSummary } from './quiz-model';
import { loadQuiz, useQuizStore } from './quiz-store';

/** A Profile row that reopens the starting quiz, with a one-line summary of the answers. */
export function QuizRow() {
  const colors = useColorScheme() === 'dark' ? darkColors : lightColors;
  const authReady = useAuthStore((state) => state.ready);
  const status = useQuizStore((state) => state.status);
  const answers = useQuizStore((state) => state.answers);

  // Signing in or out empties the answers; load the new space's.
  useEffect(() => {
    if (authReady && status === 'idle') void loadQuiz();
  }, [authReady, status]);

  const summary =
    status === 'ready' || status === 'error'
      ? answers
        ? quizSummary(answers)
        : 'Not answered yet. Discover shows a new mix each day.'
      : 'Loading…';

  return (
    <View className="mt-10">
      <AppText
        accessibilityRole="header"
        tone="secondary"
        weight="semibold"
        size={12}
        style={{ letterSpacing: 1.5, marginBottom: 12 }}
      >
        YOUR PICKS
      </AppText>
      <Pressable
        onPress={() => router.push({ pathname: '/quiz', params: { retake: '1' } })}
        accessibilityRole="button"
        accessibilityLabel={`${answers ? 'Retake the quiz' : 'Take the quiz'}, ${summary}`}
        accessibilityHint="Five quick questions that shape Discover"
        className="min-h-12 flex-row items-center gap-3 rounded-card border border-border bg-surface p-5 dark:border-dark-border dark:bg-dark-surface"
        style={({ pressed }) => ({ opacity: pressed ? 0.84 : 1 })}
      >
        <View className="flex-1">
          <AppText weight="semibold" size={18}>
            {answers ? 'Retake the quiz' : 'Take the quiz'}
          </AppText>
          <AppText tone="secondary" size={14} style={{ marginTop: 4 }}>
            {summary}
          </AppText>
        </View>
        <SymbolView
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          tintColor={colors.foregroundSecondary}
          size={24}
        />
      </Pressable>
    </View>
  );
}
