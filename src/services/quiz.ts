import { supabase } from '@/lib/supabase/client';
import { toQuizAnswers, type QuizAnswers } from '@/features/quiz/quiz-model';

// The signed-in user's quiz answers, kept on their profile row (migration 20261105150000).

/** Null until the quiz has been answered on this account. */
export async function getQuizAnswers(): Promise<QuizAnswers | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('quiz_setting, quiz_social, quiz_time, quiz_mood, quiz_cost')
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return toQuizAnswers({
    setting: data.quiz_setting,
    social: data.quiz_social,
    time: data.quiz_time,
    mood: data.quiz_mood,
    cost: data.quiz_cost,
  });
}

export async function saveQuizAnswers(answers: QuizAnswers): Promise<QuizAnswers> {
  const { data: auth, error: authError } = await supabase.auth.getSession();
  if (authError) throw authError;
  const userId = auth.session?.user.id;
  if (!userId) throw new Error('Sign in to save your answers to your account.');
  const { error } = await supabase
    .from('profiles')
    .update({
      quiz_setting: answers.setting,
      quiz_social: answers.social,
      quiz_time: answers.time,
      quiz_mood: answers.mood,
      quiz_cost: answers.cost,
      quiz_answered_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select('id')
    .single();
  if (error) throw error;
  return answers;
}
