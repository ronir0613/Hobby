import { router } from 'expo-router';
import { useEffect } from 'react';
import { ListRow } from '@/components/ListGroup';
import { useAuthStore } from '@/features/auth/auth-store';
import { quizSummary } from './quiz-model';
import { loadQuiz, useQuizStore } from './quiz-store';

/** A Profile row that reopens the starting quiz, with a one-line summary of the answers. */
export function QuizRow() {
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
        : 'Not answered yet'
      : 'Loading…';
  const title = answers ? 'Retake the quiz' : 'Take the quiz';

  return (
    <ListRow
      title={title}
      detail={summary}
      onPress={() => router.push({ pathname: '/quiz', params: { retake: '1' } })}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${summary}`}
      accessibilityHint="Five quick questions that shape Discover"
    />
  );
}
